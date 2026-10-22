// "You are what you shop." Tracks the share of each basket spent on ultra-processed food and finds the
// single moment the basket changed: the split that best separates a calm "before" from a shifted "after".
import { capitalise, listJoin, longDate, pct, round2 } from './util.js';

const MIN_BEFORE = 4;
const MIN_AFTER = 2;
const MIN_SHIFT = 0.08; // eight percentage points of spend

const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;

export function basketProfile(order, catalog) {
  let spend = 0;
  let processed = 0;
  const processedItems = [];
  for (const line of order.lines) {
    const p = catalog.get(line.sku);
    if (!p) continue;
    const cost = p.price * line.qty;
    spend += cost;
    if (p.nova >= 4) {
      processed += cost;
      processedItems.push(p.sku);
    }
  }
  return {
    orderId: order.id,
    at: order.deliveredAt,
    type: order.type,
    spend: round2(spend),
    processedShare: spend ? processed / spend : 0,
    processedItems,
  };
}

export function detectDrift({ orders, catalog }) {
  const shops = [...orders]
    .sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt))
    .map(o => basketProfile(o, catalog));
  const shares = shops.map(s => s.processedShare);
  const n = shares.length;

  let best = null;
  for (let k = MIN_BEFORE; k <= n - MIN_AFTER; k++) {
    const before = mean(shares.slice(0, k));
    const after = mean(shares.slice(k));
    const score = (after - before) * Math.sqrt((k * (n - k)) / n);
    if (!best || score > best.score) best = { k, before, after, score };
  }

  if (!best || best.after - best.before < MIN_SHIFT) {
    return { drifted: false, shops, text: 'Your baskets look like you. No drift worth mentioning.' };
  }

  const start = shops[best.k];
  const beforeSkus = new Set(shops.slice(0, best.k).flatMap(s => s.processedItems));
  const counts = new Map();
  for (const s of shops.slice(best.k)) for (const sku of new Set(s.processedItems)) counts.set(sku, (counts.get(sku) ?? 0) + 1);
  const drivers = [...counts.entries()]
    .filter(([sku]) => !beforeSkus.has(sku))
    .sort((a, b) => b[1] - a[1])
    .map(([sku, shopsWith]) => {
      const p = catalog.get(sku);
      return { sku, family: p.family, name: p.name, art: p.art, shopsWith, firstSeen: shops.slice(best.k).find(s => s.processedItems.includes(sku)).at };
    });

  const shopsSince = n - best.k - 1;
  const everyShop = shopsSince > 0 && shops.slice(best.k + 1).every(s => s.processedItems.length > 0);
  const startedWith = drivers.filter(d => start.processedItems.includes(d.sku)).map(d => shortName(d.family));

  return {
    drifted: true,
    shops,
    startIndex: best.k,
    startedAt: start.at,
    startedOn: longDate(start.at),
    startType: start.type,
    before: best.before,
    after: best.after,
    shopsSince,
    everyShop,
    drivers,
    text: `Your basket drifted toward processed food on ${longDate(start.at)}.`,
    detail: `${capitalise(listJoin(startedWith))} came in that day.${everyShop ? ` Something processed has been in all ${shopsSince} shops since.` : ''}`,
    shift: `${pct(best.before)} of spend before, ${pct(best.after)} since`,
    fix: `I've left them out of this week's cart. One tap brings any of them back.`,
  };
}

const SHORT = {
  pizza: 'frozen pizza',
  crisps: 'multipack crisps',
  nuggets: 'nuggets',
  brioche: 'brioche rolls',
  biscuits: 'chocolate digestives',
  'ready-meals': 'ready lasagne',
  'fish-fingers': 'fish fingers',
};
export const shortName = family => SHORT[family] ?? family.replace(/-/g, ' ');
