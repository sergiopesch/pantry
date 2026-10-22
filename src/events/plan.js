// The catering plan: who's coming, what they need, and which provider can feed them.
// Order for who shows up, not for who signed up. Allergies and coeliac are the exception: every one of
// those guests gets a safe plate, whatever the forecast says.
import { NEEDS } from './luma.js';
import { addHours, clock, gbp, longDate, pct, round2, toDate } from '../util.js';

const WEIGHT_SAME_KIND = 2;
const RAN_OUT_BUFFER = 0.25;
const DEFAULT_RATING = 4.0;
const DEFAULT_ON_TIME = 0.9;

// --- Who's coming -------------------------------------------------------------------------------------

export function showRate(history, event) {
  const past = history.filter(e => e.signedUp > 0 && e.attended != null);
  if (!past.length) return { rate: 0.6, basis: [], note: 'No past events yet, so 60% is a starting guess.' };
  let num = 0;
  let den = 0;
  const basis = past.map(e => {
    const w = (e.kind === event.kind ? WEIGHT_SAME_KIND : 1) * (e.ticket === event.ticket ? 1 : 0.5);
    num += (e.attended / e.signedUp) * w;
    den += w;
    return { id: e.id, name: e.name, date: e.date, signedUp: e.signedUp, attended: e.attended, rate: round2(e.attended / e.signedUp), weight: w };
  });
  return { rate: round2(num / den), basis };
}

export function headcount(world, state) {
  const { event } = world;
  const guests = world.guests.guests;
  const signedUp = guests.length;
  const sr = showRate(allHistory(world, state), event);
  const expected = Math.round(signedUp * sr.rate);
  const critical = guests.filter(g => g.needs.some(n => NEEDS[n]?.critical)).length;
  const planFor = state.planForOverride ?? Math.ceil(expected * (1 + event.spare));
  return {
    signedUp,
    waitlist: state.guests?.waitlist ?? world.guests.waitlist,
    showRate: sr.rate,
    basis: sr.basis,
    expected,
    spare: event.spare,
    planFor,
    overridden: state.planForOverride != null,
    criticalAt100: critical,
    text: `${signedUp} signed up. Your last ${sr.basis.length} events point to ${pct(sr.rate)} turning up. Plan for ${planFor}, not ${signedUp}.`,
  };
}

// --- What they need -----------------------------------------------------------------------------------

export function diets(world, state) {
  const guests = world.guests.guests;
  const counts = {};
  for (const g of guests) for (const n of g.needs) counts[n] = (counts[n] ?? 0) + 1;
  const prefs = {};
  for (const g of guests) for (const p of g.prefs) prefs[p] = (prefs[p] ?? 0) + 1;
  const declared = guests.filter(g => g.needs.length).length;
  return {
    signedUp: guests.length,
    declared,
    none: guests.length - declared,
    needs: Object.entries(NEEDS).filter(([id]) => counts[id]).map(([id, n]) => ({ id, label: n.label, count: counts[id], critical: Boolean(n.critical) })),
    preferences: Object.entries(prefs).map(([id, count]) => ({ id, label: id === 'mild' ? 'Not spicy' : id, count })),
    rules: [
      'Allergies and coeliac are planned for every sign-up, not the forecast.',
      'Every guest with a declared need gets at least one safe main.',
      'Diets come only from what guests declared. Nothing is inferred.',
    ],
  };
}

// --- Matching dishes to needs ---------------------------------------------------------------------------

const has = (dish, ...tags) => tags.some(t => dish.tags.includes(t));
const TEST = {
  vegan: d => has(d, 'vegan'),
  vegetarian: d => has(d, 'vegan', 'vegetarian'),
  pescatarian: d => has(d, 'vegan', 'vegetarian', 'fish'),
  halal: d => has(d, 'halal', 'vegan', 'vegetarian', 'fish'),
  'gluten-free': d => has(d, 'gluten-free', 'coeliac-safe'),
  coeliac: d => has(d, 'coeliac-safe'),
  'dairy-free': d => has(d, 'vegan', 'dairy-free'),
  'no-pork': d => !has(d, 'pork'),
};

function safe(provider, dish, needs) {
  for (const n of needs) {
    if (n === 'nut-allergy') {
      if (provider.allergens === 'kitchen-may-contain' || !has(dish, 'nut-free')) return false;
    } else if (!TEST[n]?.(dish)) return false;
  }
  return true;
}

const laneFor = needs =>
  needs.some(n => NEEDS[n]?.critical) ? 'allergy-safe' : needs.includes('vegan') || needs.includes('dairy-free') ? 'vegan' : needs.includes('gluten-free') ? 'gluten-free' : 'everyone';

export const LANES = { everyone: 'Everyone', vegan: 'Vegan', 'gluten-free': 'Gluten-free', 'allergy-safe': 'Allergy-safe' };

// Lanes that ran out at a past event get a buffer, whoever cooks next time.
function ranOutLanes(history) {
  const lanes = new Map();
  for (const e of history) for (const l of e.ranOut ?? []) if (!lanes.has(l)) lanes.set(l, e);
  return lanes;
}

// --- Provider ledger ----------------------------------------------------------------------------------

export const allHistory = (world, state) => [...world.history, ...(state.debriefs ?? [])];

export function ledger(world, state) {
  const history = allHistory(world, state);
  return (world.knownProviders ?? world.providers).map(p => {
    const runs = history.filter(e => e.provider === p.id);
    const rating = runs.length ? round2(runs.reduce((s, e) => s + e.rating, 0) / runs.length) : null;
    const onTime = runs.length ? round2(runs.filter(e => e.onTime).length / runs.length) : null;
    return {
      id: p.id,
      name: p.name,
      tier: p.tier,
      example: Boolean(p.example),
      events: runs.length,
      rating,
      onTime,
      avgMinsLate: runs.length ? Math.round(runs.reduce((s, e) => s + (e.minsLate ?? 0), 0) / runs.length) : null,
      ranOut: [...new Set(runs.flatMap(e => e.ranOut ?? []))],
      notes: runs.map(e => `${e.date}: ${e.notes}`),
      quote: state.quotes?.[p.id] ?? null,
    };
  });
}

// --- Options across tiers -----------------------------------------------------------------------------

function groupGuests(guests) {
  const groups = new Map();
  for (const g of guests) {
    const key = g.needs.join('+');
    if (!groups.has(key)) groups.set(key, { needs: g.needs, count: 0 });
    groups.get(key).count++;
  }
  return [...groups.values()];
}

export function option(world, state, provider, hc, ctx) {
  const { event } = world;
  const guests = world.guests.guests;
  const lines = new Map();
  const addons = new Map();
  const add = (dish, lane, qty, from = provider) => {
    if (qty <= 0) return;
    const key = `${lane}:${dish.id}`;
    const l = lines.get(key) ?? { key, lane, dish: dish.id, name: dish.name, tags: dish.tags, price: dish.price, qty: 0, provider: from.id, providerName: from.name };
    l.qty += qty;
    lines.set(key, l);
  };
  const gaps = [];
  const buffers = [];
  let restricted = 0;
  const groups = groupGuests(guests);
  for (const g of groups.filter(x => x.needs.length)) {
    const dish = menu(provider, ctx).filter(d => safe(provider, d, g.needs)).sort((a, b) => a.price - b.price)[0];
    const lane = laneFor(g.needs);
    const critical = g.needs.some(n => NEEDS[n]?.critical);
    let qty = critical ? g.count : Math.ceil(g.count * hc.showRate);
    const past = g.needs.map(n => ctx.ranOut.get(n)).find(Boolean);
    if (past && !critical) {
      const extra = Math.ceil(qty * RAN_OUT_BUFFER);
      qty += extra;
      buffers.push({ need: g.needs.join(' + '), extra, why: `${g.needs.map(n => NEEDS[n].label).join(' and ')} ran out on ${longDate(past.date)}` });
    }
    restricted += qty;
    if (!dish) {
      // Allergy and coeliac plates can come sealed from a second provider, as real organisers do.
      const addon = critical ? addonFor(provider, g.needs, ctx) : null;
      if (addon) {
        add(addon.dish, lane, qty, addon.provider);
        addons.set(addon.provider.id, addon.provider);
        continue;
      }
      gaps.push({ needs: g.needs, label: g.needs.filter(n => !(n === 'gluten-free' && g.needs.includes('coeliac'))).map(n => NEEDS[n].label).join(' + '), guests: g.count });
      continue;
    }
    add(dish, lane, qty);
  }
  // Everyone else: split across the provider's general dishes.
  const open = menu(provider, ctx).filter(d => !has(d, 'sealed', 'coeliac-safe'));
  const general = open.length ? open : menu(provider, ctx);
  const rest = Math.max(0, hc.planFor - restricted);
  general.forEach((d, i) => add(d, 'everyone', Math.floor(rest / general.length) + (i < rest % general.length ? 1 : 0)));

  const portions = [...lines.values()].reduce((s, l) => s + l.qty, 0);
  const food = round2([...lines.values()].reduce((s, l) => s + l.qty * l.price, 0));
  const extras = round2((provider.extras?.perHead ?? 0) * hc.planFor);
  const fee = (provider.fulfilment.fee ?? 0) + [...addons.values()].reduce((t, a) => t + (a.fulfilment.fee ?? 0), 0);
  const quoted = state.quotes?.[provider.id]?.amount;
  const total = round2(quoted ?? food + extras + fee);

  const serve = toDate(event.serve);
  const beforeServe = addHours(serve, -event.landBeforeServeMins / 60);
  const cutoff = ctx.latestDelivery ? toDate(ctx.latestDelivery) : null;
  const landBy = cutoff && cutoff < beforeServe ? cutoff : beforeServe;
  const orderBy = addHours(landBy, -provider.fulfilment.leadHours);
  const now = toDate(ctx.now);
  const area = event.venue.postcodeArea;

  const excluded = [];
  for (const g of gaps) excluded.push(`No safe option for ${g.label}: ${g.guests} ${g.guests === 1 ? 'guest' : 'guests'} would go without`);
  if (total > event.budget.total) excluded.push(`${gbp(total)} is over the ${gbp(event.budget.total)} budget by ${gbp(total - event.budget.total)}`);
  if (now > orderBy) excluded.push(`Needs ${provider.fulfilment.leadHours} hours' notice; the order-by time has passed`);
  if (area && provider.deliversTo && !provider.deliversTo.includes(area)) excluded.push(`Doesn't deliver to ${area}`);
  if (provider.maxPortions && portions > provider.maxPortions) excluded.push(`Takes at most ${provider.maxPortions} portions per order`);
  const addonWarnings = [];
  for (const a of addons.values()) {
    if (now > addHours(landBy, -a.fulfilment.leadHours)) excluded.push(`${a.name} needs ${a.fulfilment.leadHours} hours' notice for the allergy-safe plates; too late`);
    if (area && a.deliversTo && !a.deliversTo.includes(area)) excluded.push(`${a.name} doesn't deliver to ${area}`);
    addonWarnings.push(`Allergy-safe plates come sealed from ${a.name}, delivered separately`);
  }
  const warnings = [...addonWarnings];
  if (!area) warnings.push('Venue postcode not set, so delivery coverage is unchecked');
  else if (!provider.deliversTo) warnings.push(`Delivery to ${area} not confirmed with them`);
  if (total < (provider.minOrder ?? 0)) warnings.push(`Below the ${gbp(provider.minOrder)} minimum order`);
  if (provider.fulfilment.type === 'collection') warnings.push(`Someone has to collect it: about ${provider.fulfilment.travelMins} minutes each way`);
  if (provider.source === 'estimate') warnings.push('Prices are estimates; check them on the live site before paying');
  if (provider.example) warnings.push('Example provider until a real one is added');

  const book = ctx.ledger.find(l => l.id === provider.id);
  // Our own history first; otherwise the provider's public reviews; otherwise a neutral prior.
  const rating = book.rating ?? provider.reviews?.rating ?? DEFAULT_RATING;
  const onTime = book.onTime ?? DEFAULT_ON_TIME;
  // Drop earlier for providers that ran late before.
  const earlierMins = book.avgMinsLate ? Math.ceil(book.avgMinsLate / 15) * 15 : 0;
  const dropAt = addHours(landBy, -earlierMins / 60);

  return {
    id: provider.id,
    name: addons.size ? `${provider.name} + ${[...addons.values()].map(a => a.name).join(' + ')}` : provider.name,
    addons: [...addons.values()].map(a => ({ id: a.id, name: a.name, source: a.source ?? null })),
    tier: provider.tier,
    source: provider.source ?? (provider.example ? 'example' : 'provider'),
    live: Boolean(provider.live),
    fulfilment: provider.fulfilment,
    allergens: provider.allergens,
    lines: [...lines.values()],
    portions,
    cost: { food, extras, fee, total, quoted: quoted != null, perExpected: round2(total / hc.expected), perHeadPlanned: round2(total / hc.planFor) },
    fitsBudget: total <= event.budget.total,
    coverage: { safeForEveryone: gaps.length === 0, gaps },
    orderBy: orderBy.toISOString(),
    dropAt: dropAt.toISOString(),
    dropEarlierMins: earlierMins,
    venueCutoff: cutoff && cutoff < beforeServe ? cutoff.toISOString() : null,
    buffers,
    record: { events: book.events, rating: book.rating, onTime: book.onTime, ranOut: book.ranOut },
    reviews: provider.reviews ?? null,
    rating,
    onTime,
    excluded,
    eligible: excluded.length === 0,
    warnings,
    notes: provider.notes ?? [],
  };
}

// The organiser can take dishes off a provider's menu; the plan re-spreads the plates.
const menu = (provider, ctx) => provider.dishes.filter(d => !ctx.off?.has(`${provider.id}:${d.id}`));

// The cheapest sealed dish another provider has that is safe for these needs.
function addonFor(main, needs, ctx) {
  let best = null;
  for (const p of ctx.providers ?? []) {
    if (p.id === main.id) continue;
    for (const d of menu(p, ctx)) {
      if (!safe(p, d, needs) || !has(d, 'sealed')) continue;
      if (!best || d.price < best.dish.price) best = { provider: p, dish: d };
    }
  }
  return best;
}

// Quality first, inside the budget: rating and reliability carry most of the weight, cost and logistics the rest.
function score(o, cheapest) {
  const quality = Math.max(0, Math.min(1, (o.rating - 3) / 2));
  const cost = cheapest / o.cost.total;
  const logistics = o.fulfilment.type === 'delivery' ? 1 : 0.4;
  const ranOutPenalty = 0.05 * (o.record.ranOut?.length ?? 0);
  return round2(0.4 * quality + 0.25 * o.onTime + 0.2 * cost + 0.15 * logistics - ranOutPenalty);
}

export function options(world, state, { now, latestDelivery } = {}) {
  const hc = headcount(world, state);
  const ctx = { now: now ?? state.clock ?? new Date().toISOString(), latestDelivery, providers: world.providers, off: new Set(state.dishOff ?? []), ranOut: ranOutLanes(allHistory(world, state)), ledger: ledger(world, state) };
  const all = world.providers.map(p => option(world, state, p, hc, ctx));
  const cheapest = Math.min(...all.filter(o => o.eligible).map(o => o.cost.total));
  for (const o of all) o.score = o.eligible ? score(o, cheapest) : null;
  all.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.cost.total - b.cost.total);
  return { headcount: hc, options: all };
}

export function plan(world, state, opts) {
  const { headcount: hc, options: all } = options(world, state, opts);
  const eligible = all.filter(o => o.eligible);
  const recommended = eligible[0] ?? null;
  const chosen = all.find(o => o.id === state.choice) ?? recommended;
  if (!chosen) return { headcount: hc, chosen: null, recommended: null, text: 'No provider can feed everyone safely within the budget. Raise the budget or add a provider.' };
  const cheaper = eligible.filter(o => o.cost.total < chosen.cost.total).sort((a, b) => a.cost.total - b.cost.total)[0];
  const lanes = Object.entries(LANES)
    .map(([id, label]) => ({ id, label, lines: chosen.lines.filter(l => l.lane === id), portions: chosen.lines.filter(l => l.lane === id).reduce((s, l) => s + l.qty, 0) }))
    .filter(l => l.portions);
  const { event } = world;
  const logistics = [
    `${chosen.fulfilment.type === 'delivery' ? 'Lands' : 'Collected and back'} by ${clock(chosen.dropAt)}${chosen.venueCutoff ? ': the venue takes deliveries until then' : `, ${event.landBeforeServeMins} minutes before food at ${clock(event.serve)}`}${chosen.dropEarlierMins ? ` (${chosen.dropEarlierMins} minutes early: they ran late before)` : ''}`,
    `Order by ${longDate(chosen.orderBy)}, ${clock(chosen.orderBy)}`,
    ...event.venue.access,
    ...(lanes.some(l => l.id === 'allergy-safe') ? ['Allergy-safe plates sealed, labelled, and on their own table'] : []),
  ];
  const take = cheaper
    ? `${cheaper.name} would save ${gbp(chosen.cost.total - cheaper.cost.total)}, but ${cheaper.record.ranOut?.length ? `${cheaper.record.ranOut.join(' and ')} ran out last time` : `it rates ${cheaper.rating} to ${chosen.rating}`}.`
    : `It's also the cheapest safe option.`;
  return {
    headcount: hc,
    chosen,
    recommended: recommended?.id ?? null,
    isRecommended: chosen.id === recommended?.id,
    lanes,
    logistics,
    budget: { total: event.budget.total, spend: chosen.cost.total, left: round2(event.budget.total - chosen.cost.total) },
    alternatives: eligible.filter(o => o.id !== chosen.id).slice(0, 3).map(o => ({ id: o.id, name: o.name, tier: o.tier, total: o.cost.total, score: o.score })),
    text: `${chosen.name}: ${chosen.portions} plates, ${gbp(chosen.cost.total)} (${gbp(chosen.cost.perExpected)} a head). ${take}`,
  };
}
