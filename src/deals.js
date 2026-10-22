// Deals only count when they match what's already predicted. Everything else is noise, ignored on purpose.
import { decide } from './household.js';
import { dateKey, longDate, round2 } from './util.js';

export const activeAt = (deal, at) => {
  const day = dateKey(at);
  return deal.validFrom <= day && day <= deal.validTo;
};

export function matchDeals({ cart, deals, catalog, household, predictions, at }) {
  const clipped = [];
  const offers = [];
  const ignored = [];

  for (const deal of deals) {
    if (!activeAt(deal, at)) continue;
    const product = catalog.get(deal.sku);
    if (!product) continue;

    const decision = decide(product, household);
    if (!decision.include) {
      ignored.push({ id: deal.id, label: deal.label, name: product.name, art: product.art, why: decision.why });
      continue;
    }

    const same = cart.lines.find(l => l.sku === deal.sku && l.status === 'in');
    if (same) {
      const saving = round2((same.unitPrice - deal.price) * same.qty);
      if (saving > 0) {
        same.deal = { id: deal.id, label: deal.label, type: deal.type, price: deal.price, saving };
        clipped.push({ id: deal.id, label: deal.label, type: deal.type, name: product.name, art: product.art, line: same.key, saving });
      }
      continue;
    }

    const sibling = cart.lines.find(l => l.family === product.family && l.status === 'in');
    if (sibling) {
      const from = catalog.get(sibling.sku);
      const qty = Math.ceil((sibling.qty * from.pack.units) / product.pack.units - 1e-9);
      const cost = round2(qty * deal.price);
      const saving = round2(sibling.price - cost);
      if (saving > 0) {
        offers.push({
          id: deal.id,
          label: deal.label,
          family: product.family,
          line: sibling.key,
          validFrom: deal.validFrom,
          validTo: deal.validTo,
          from: { sku: from.sku, name: from.name, art: from.art, image: from.image, qty: sibling.qty, unitPrice: from.price, units: from.pack.units, unit: from.pack.unit, price: sibling.price },
          to: { sku: product.sku, name: product.name, art: product.art, image: product.image, qty, unitPrice: deal.price, was: product.price, units: product.pack.units, unit: product.pack.unit, price: cost },
          coverage: product.pack.units / from.pack.units,
          perRunSaving: round2(from.price - deal.price * (from.pack.units / product.pack.units)),
          saving,
        });
      } else {
        ignored.push({ id: deal.id, label: deal.label, name: product.name, art: product.art, why: `Dearer per ${from.pack.unit} than what's already in.` });
      }
      continue;
    }

    const pr = predictions.find(p => p.family === product.family);
    ignored.push({
      id: deal.id,
      label: deal.label,
      name: product.name,
      art: product.art,
      why: pr ? `Not running out. You're fine till ${longDate(pr.runsOutAt)}.` : 'Not something you buy.',
    });
  }

  return { clipped, offers, ignored, saving: round2(clipped.reduce((s, c) => s + c.saving, 0)) };
}
