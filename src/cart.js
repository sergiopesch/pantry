// One cart, three people. Quantities come from the prediction engine (cover the week after delivery),
// pack sizes from what the household actually buys, lanes from the household rules.
import { decide } from './household.js';
import { dateKey, round2 } from './util.js';

const TOLERANCE = 0.15; // skip a family when the shortfall is under 15% of its smallest pack

// Greedy over the pack sizes this household already buys: big packs first, smallest pack tops up.
export function choosePacks(need, skus, catalog) {
  const packs = skus.map(s => catalog.get(s.sku)).filter(Boolean).sort((a, b) => b.pack.units - a.pack.units);
  const out = [];
  let remaining = need;
  packs.forEach((p, i) => {
    if (remaining <= 0) return;
    const ratio = remaining / p.pack.units;
    const n = i === packs.length - 1 ? Math.ceil(ratio - TOLERANCE) : Math.floor(ratio + TOLERANCE);
    if (n > 0) {
      out.push({ sku: p.sku, qty: n });
      remaining -= n * p.pack.units;
    }
  });
  return out;
}

export function isUnavailable(sku, at, availability) {
  const day = dateKey(at);
  return (availability?.unavailable ?? []).some(u => u.sku === sku && (!u.date || u.date === day));
}

function unitPrice(p) {
  return p.price / p.pack.units;
}

export function alternatives(product, { catalog, household, availability, deliveryAt }) {
  return catalog
    .family(product.family)
    .filter(p => p.sku !== product.sku && decide(p, household).include && !isUnavailable(p.sku, deliveryAt, availability))
    .sort((a, b) => (b.pack.units === product.pack.units) - (a.pack.units === product.pack.units) || unitPrice(a) - unitPrice(b));
}

// Preferences carry an optional validity window (a deal switch lasts as long as the deal).
export function preferenceActive(pref, at) {
  const day = dateKey(at);
  return (!pref.validFrom || pref.validFrom <= day) && (!pref.validTo || day <= pref.validTo);
}

const convert = (qty, from, to) => Math.max(1, Math.ceil((qty * from.pack.units) / to.pack.units - 1e-9));

function resolve(sku, qty, ctx) {
  let product = ctx.catalog.get(sku);
  let replaced = null;

  const pref = ctx.preferences[product.family];
  if (pref && pref.from === sku && ctx.catalog.get(pref.to) && preferenceActive(pref, ctx.deliveryAt)) {
    const to = ctx.catalog.get(pref.to);
    replaced = { from: product.sku, fromName: product.name, fromPrice: product.price, fromQty: qty, reason: pref.reason, text: pref.text };
    qty = convert(qty, product, to);
    product = to;
  }

  if (isUnavailable(product.sku, ctx.deliveryAt, ctx.availability)) {
    const alt = alternatives(product, ctx)[0];
    if (alt) {
      replaced = { from: product.sku, fromName: product.name, fromPrice: product.price, fromQty: qty, reason: 'unavailable' };
      qty = convert(qty, product, alt);
      product = alt;
    }
  }
  return { product, qty, replaced };
}

function makeLine({ key, product, qty, decision, prediction, replaced, ctx }) {
  return {
    key,
    family: product.family,
    sku: product.sku,
    name: product.name,
    art: product.art,
    image: product.image,
    url: product.url,
    source: product.source,
    pack: product.pack,
    qty,
    unitPrice: product.price,
    price: round2(product.price * qty),
    lane: decision.lane,
    eaters: decision.eaters,
    why: decision.why,
    rule: decision.rule,
    runsOutAt: prediction?.runsOutAt ?? null,
    perWeek: prediction?.perWeek ?? null,
    replaced,
    alternatives: alternatives(product, ctx).map(p => p.sku),
    status: 'in',
    deal: null,
  };
}

// Merge lines that resolved to the same SKU (e.g. a learned switch to loose bananas).
function mergeLines(lines) {
  const bySku = new Map();
  for (const line of lines) {
    const hit = bySku.get(line.sku);
    if (hit) {
      hit.qty += line.qty;
      hit.price = round2(hit.unitPrice * hit.qty);
      hit.replaced ??= line.replaced;
      if (hit.replaced && line.replaced) hit.replaced.fromQty = (hit.replaced.fromQty ?? 0) + (line.replaced.fromQty ?? 0);
    } else {
      bySku.set(line.sku, { ...line });
    }
  }
  return [...bySku.values()];
}

export function buildCart({ household, catalog, availability, predictions, deliveryAt, horizonDays = 7, preferences = {}, edits = {} }) {
  const ctx = { household, catalog, availability, deliveryAt, preferences };
  const lines = [];
  const leftOut = [];
  const skipped = [];

  for (const pr of predictions) {
    const usual = catalog.get(pr.usualSku);
    const decision = decide(usual, household);
    const stockAtDelivery = pr.stockAt(deliveryAt);
    const need = pr.rate * horizonDays - stockAtDelivery;

    if (!decision.include) {
      leftOut.push({ key: usual.sku, family: usual.family, sku: usual.sku, name: usual.name, art: usual.art, image: usual.image, price: usual.price, why: decision.why, rule: decision.rule, lastAt: pr.lastAt });
      continue;
    }

    const packs = choosePacks(need, pr.skus, catalog);
    if (!packs.length) {
      skipped.push({ family: pr.family, sku: usual.sku, name: usual.name, art: usual.art, runsOutAt: pr.runsOutAt, stockAtDelivery });
      continue;
    }

    const familyLines = packs.map(({ sku, qty }) => {
      const r = resolve(sku, qty, ctx);
      return makeLine({ key: sku, product: r.product, qty: r.qty, decision: decide(r.product, household), prediction: pr, replaced: r.replaced, ctx });
    });
    lines.push(...mergeLines(familyLines));
  }

  // Human edits, in the order they were made: exclude, include, swap, set a quantity, add something new,
  // or bring back something Pantry left out.
  for (const [key, edit] of Object.entries(edits)) {
    if (edit.action === 'add') {
      const p = catalog.get(edit.sku);
      if (!p) continue;
      const existing = lines.find(l => l.sku === edit.sku);
      if (existing) {
        existing.qty += edit.qty;
        existing.price = round2(existing.unitPrice * existing.qty);
        existing.status = 'in';
        existing.requested = true;
        continue;
      }
      const d = decide(p, household);
      const decision = d.include ? d : { lane: 'everyone', eaters: household.members.map(m => m.id), why: 'You asked for it.', rule: 'human-override' };
      lines.push({ ...makeLine({ key, product: p, qty: edit.qty, decision, prediction: null, replaced: null, ctx }), requested: true });
      const gone = leftOut.findIndex(l => l.family === p.family);
      if (gone >= 0) leftOut.splice(gone, 1);
      continue;
    }
    const idx = lines.findIndex(l => l.key === key);
    if (edit.action === 'qty' && idx >= 0) {
      const line = lines[idx];
      line.qty = Math.max(1, Math.round(edit.qty));
      line.price = round2(line.unitPrice * line.qty);
      line.status = 'in';
      continue;
    }
    if (edit.action === 'exclude' && idx >= 0) lines[idx].status = 'out';
    if (edit.action === 'include' && idx >= 0) lines[idx].status = 'in';
    if (edit.action === 'swap' && idx >= 0 && catalog.get(edit.sku)) {
      const current = lines[idx];
      const to = catalog.get(edit.sku);
      const qty = convert(current.qty, catalog.get(current.sku), to);
      lines[idx] = {
        ...makeLine({ key, product: to, qty, decision: decide(to, household), prediction: { runsOutAt: current.runsOutAt, perWeek: current.perWeek }, replaced: { from: current.sku, fromName: current.name, fromPrice: current.unitPrice, fromQty: current.qty, reason: 'you-swapped' }, ctx }),
      };
    }
    const left = leftOut.findIndex(l => l.key === key);
    if (edit.action === 'include' && left >= 0) {
      const p = catalog.get(leftOut[left].sku);
      lines.push({
        ...makeLine({ key, product: p, qty: 1, decision: { lane: 'everyone', eaters: household.members.map(m => m.id), why: 'You asked for it back.', rule: 'human-override' }, prediction: null, replaced: null, ctx }),
      });
      leftOut.splice(left, 1);
    }
  }

  return { deliveryAt: new Date(deliveryAt).toISOString(), horizonDays, lines, leftOut, skipped };
}

export function totals(cart, fee = 0) {
  const live = cart.lines.filter(l => l.status === 'in');
  const subtotal = round2(live.reduce((s, l) => s + l.price, 0));
  const savings = round2(live.reduce((s, l) => s + (l.deal?.saving ?? 0), 0));
  const items = round2(subtotal - savings);
  return { count: live.length, units: live.reduce((s, l) => s + l.qty, 0), subtotal, savings, items, fee: round2(fee), total: round2(items + fee) };
}

export function byLane(cart, household) {
  const lanes = Object.keys(household.lanes);
  return lanes.map(id => {
    const lines = cart.lines.filter(l => l.lane === id && l.status === 'in');
    return { id, label: household.lanes[id], lines, subtotal: round2(lines.reduce((s, l) => s + l.price - (l.deal?.saving ?? 0), 0)) };
  });
}
