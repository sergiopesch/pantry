// Learns consumption from baskets, never from questionnaires.
// For each product family: average daily use across the history, a stock simulation through every
// delivery, and the moment the current stock hits zero. A midweek top-up is read as "we ran out":
// stock resets to zero before the top-up lands. That is how a basket reveals the run-out moment.
import { addDays, daysBetween, shortDay, toDate } from './util.js';

const MIN_EVENTS = 3;
const MIN_SPAN_DAYS = 6;

function familyEvents(orders, catalog, now) {
  const raw = new Map();
  for (const order of orders) {
    const at = toDate(order.deliveredAt);
    if (at > now) continue;
    for (const line of order.lines) {
      const product = catalog.get(line.sku);
      if (!product) continue;
      const list = raw.get(product.family) ?? [];
      list.push({ at, units: line.qty * product.pack.units, orderId: order.id, type: order.type, sku: line.sku, qty: line.qty });
      raw.set(product.family, list);
    }
  }
  const byFamily = new Map();
  for (const [family, list] of raw) {
    list.sort((a, b) => a.at - b.at);
    const merged = [];
    for (const e of list) {
      const last = merged.at(-1);
      if (last && +last.at === +e.at) {
        last.units += e.units;
        last.lines.push({ sku: e.sku, qty: e.qty });
      } else {
        merged.push({ at: e.at, units: e.units, orderId: e.orderId, type: e.type, lines: [{ sku: e.sku, qty: e.qty }] });
      }
    }
    byFamily.set(family, merged);
  }
  return byFamily;
}

export function simulateStock(events, rate, t) {
  let stock = 0;
  let clock = events[0].at;
  for (const e of events) {
    if (e.at > t) break;
    const left = e.type === 'top-up' ? 0 : Math.max(0, stock - rate * daysBetween(clock, e.at));
    stock = left + e.units;
    clock = e.at;
  }
  return Math.max(0, stock - rate * daysBetween(clock, t));
}

function usualSkus(events) {
  const counts = new Map();
  for (const e of events) for (const l of e.lines) counts.set(l.sku, (counts.get(l.sku) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([sku, n]) => ({ sku, orders: n }));
}

function confidence(events) {
  const gaps = events.slice(1).map((e, i) => daysBetween(events[i].at, e.at));
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length);
  const cv = sd / mean;
  if (events.length >= 8 && cv < 0.5) return 'high';
  if (events.length >= 4) return 'medium';
  return 'low';
}

export function predictFamilies({ orders, catalog, now }) {
  now = toDate(now);
  const out = [];
  for (const [family, events] of familyEvents(orders, catalog, now)) {
    if (events.length < MIN_EVENTS) continue;
    const span = daysBetween(events[0].at, events.at(-1).at);
    if (span < MIN_SPAN_DAYS) continue;
    const consumed = events.slice(0, -1).reduce((s, e) => s + e.units, 0);
    const rate = consumed / span;
    if (!(rate > 0)) continue;
    const stockNow = simulateStock(events, rate, now);
    const skus = usualSkus(events);
    const usual = catalog.get(skus[0].sku);
    const byDay = {};
    for (const e of events) byDay[shortDay(e.at)] = (byDay[shortDay(e.at)] ?? 0) + 1;
    out.push({
      family,
      unit: usual.pack.unit,
      usualSku: usual.sku,
      skus,
      rate,
      perWeek: rate * 7,
      events: events.length,
      firstAt: events[0].at.toISOString(),
      lastAt: events.at(-1).at.toISOString(),
      history: events.map(e => ({ at: e.at.toISOString(), units: e.units, type: e.type })),
      byDay,
      stockNow,
      runsOutAt: addDays(now, stockNow / rate).toISOString(),
      confidence: confidence(events),
      stockAt: t => simulateStock(events, rate, toDate(t)),
    });
  }
  return out.sort((a, b) => a.runsOutAt.localeCompare(b.runsOutAt));
}

// Plain-JSON view (drops the stockAt closure).
export const serialisePrediction = ({ stockAt, ...rest }) => rest;
