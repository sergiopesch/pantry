// Pantry's own inbox. Every retailer email lands here. Most get handled quietly; a missing item becomes a
// drafted case (filing it is an external write, so it waits for one tap); only what needs a human surfaces.
// It also learns: an item that keeps going missing gets swapped for one that turns up.
import { decide } from './household.js';
import { dateList, dayMonth, gbp, toDate } from './util.js';

export function nice(name) {
  return String(name)
    .replace(/^Sainsbury's\s+/i, '')
    .replace(/\s+\d+(\.\d+)?\s?(g|kg|ml|l|L)\b.*$/, '')
    .replace(/\s+x\d+$/i, '')
    .replace(/\s+\d+x\d+g$/i, '')
    .trim();
}

// When did the item go missing? The delivery in the order id beats the date the email arrived.
function orderDate(order, fallback) {
  const day = String(order ?? '').match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return day ? `${day}T12:00:00Z` : fallback;
}

export function classify(email) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  if (email.substitutions?.length || /substitut|replaced with/.test(text)) return 'substitution';
  if (email.refund || /refund/.test(text)) return 'refund';
  if (email.missing?.items?.length || /missing|couldn't deliver|could not deliver/.test(text)) return 'missing';
  if (/delay|running late|rescheduled/.test(text)) return 'delay';
  if (/on its way|on the way|out for delivery/.test(text)) return 'on-its-way';
  if (/confirm|thanks for your order|order received/.test(text)) return 'confirmation';
  if (/offers?|points|% off|newsletter|save on/.test(text)) return 'marketing';
  return 'other';
}

const owner = (product, household) => {
  const d = decide(product, household);
  if (d.lane === 'child') return 'her';
  if (d.lane === 'adults') return 'your';
  return 'the';
};

export function triage({ emails, catalog, household, caseStatus = {} }) {
  const sorted = [...emails].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const items = [];
  const cases = [];
  const missing = new Map(); // sku -> [{ on: when it went missing, seenAt: when Pantry read about it }]
  const report = (sku, on, seenAt) => missing.set(sku, [...(missing.get(sku) ?? []), { on, seenAt }]);

  for (const email of sorted) {
    const kind = classify(email);
    const base = { id: email.id, from: email.from, subject: email.subject, receivedAt: email.receivedAt, kind };

    if (kind === 'substitution') {
      for (const sub of email.substitutions ?? []) {
        const ordered = catalog.byName(sub.ordered);
        const received = catalog.byName(sub.received);
        const verdict = received ? decide(received, household) : null;
        if (verdict && !verdict.include) {
          const id = `case-${email.id}`;
          const status = caseStatus[id] ?? 'awaiting-approval';
          if (status === 'kept' || status === 'filed') {
            items.push({ ...base, action: 'filed', silent: true, caseId: id, note: status === 'kept' ? 'You kept them. Noted for next time.' : `Refund requested for ${nice(sub.received).toLowerCase()}.` });
            continue;
          }
          cases.push({ id, kind: 'substitution-refund', order: sub.order, item: sub.received, amount: sub.price, status, text: `${sub.received} arrived as a substitute for ${sub.ordered} on ${dayMonth(email.receivedAt)}. We'd like a refund of ${gbp(sub.price)}.` });
          const what = received.tags.includes('ultra-processed') ? "That's a processed treat." : verdict.why;
          items.push({ ...base, action: 'needs-you', silent: false, caseId: id, note: `They swapped ${ordered ? owner(ordered, household) : 'the'} ${nice(sub.ordered).toLowerCase()} for ${nice(sub.received).toLowerCase()}. ${what} Keep them, or want the refund?` });
        } else {
          items.push({ ...base, action: 'filed', silent: true, note: `Swapped ${nice(sub.ordered).toLowerCase()} for ${nice(sub.received).toLowerCase()}. Fits the rules, so I let it be.` });
        }
      }
      continue;
    }

    if (kind === 'missing') {
      if (!email.missing?.items?.length) {
        items.push({ ...base, action: 'needs-you', silent: false, note: "Something went missing and I couldn't tell what. Worth a look." });
        continue;
      }
      for (const [i, it] of email.missing.items.entries()) {
        const product = catalog.byName(it.name);
        if (product) report(product.sku, orderDate(email.missing.order, email.receivedAt), email.receivedAt);
        const id = `case-${email.id}-${i}`;
        const status = caseStatus[id] ?? 'awaiting-approval';
        cases.push({ id, kind: 'missing-item', order: email.missing.order, item: it.name, amount: it.price, status, text: `${it.qty} x ${it.name} was missing from my delivery on ${dayMonth(email.receivedAt)}. Please refund ${gbp(it.price)}.` });
        items.push({ ...base, action: status === 'filed' ? 'filed' : 'case-drafted', silent: false, caseId: id, note: `${nice(it.name)} missing. Refund case drafted for ${gbp(it.price)}. One tap files it.` });
      }
      continue;
    }

    if (kind === 'refund') {
      for (const it of email.refund?.items ?? []) {
        const product = catalog.byName(it.name);
        if (product) report(product.sku, orderDate(email.refund.order, email.receivedAt), email.receivedAt);
      }
      items.push({ ...base, action: 'filed', silent: true, note: `${gbp(email.refund?.amount ?? 0)} refund landed. Logged.` });
      continue;
    }

    if (kind === 'delay') {
      items.push({ ...base, action: 'needs-you', silent: false, note: 'Delivery running late. Want me to rebook?' });
      continue;
    }

    if (kind === 'marketing') {
      items.push({ ...base, action: 'archived', silent: true, note: 'Nothing in it you were going to buy.' });
      continue;
    }

    const notes = { 'on-its-way': 'Driver on the way. Nothing to do.', confirmation: 'Order confirmed. Filed.', other: 'Filed.' };
    items.push({ ...base, action: 'filed', silent: true, note: notes[kind] });
  }

  // Learn: anything missing twice gets swapped for a sibling the household already buys.
  const learnings = [];
  for (const [sku, reports] of missing) {
    if (reports.length < 2) continue;
    const dates = reports.map(r => r.on).sort();
    const learnedAt = reports.map(r => r.seenAt).sort()[1];
    const from = catalog.get(sku);
    const to = catalog.family(from.family).find(p => p.sku !== sku && decide(p, household).include);
    if (!to) continue;
    learnings.push({
      family: from.family,
      from: sku,
      to: to.sku,
      reason: 'learned',
      learnedAt,
      text: `${nice(from.name)} went missing ${dates.length === 2 ? 'twice' : `${dates.length} times`} (${dateList(dates)}). ${/loose/i.test(to.name) ? 'Loose from now on.' : `Switching to ${nice(to.name)}.`}`,
    });
  }

  const silent = items.filter(i => i.silent).length;
  const needsYou = items.filter(i => i.action === 'needs-you').length;
  const drafted = cases.filter(c => c.kind === 'missing-item' && c.status === 'awaiting-approval').length;
  return {
    items,
    cases,
    learnings,
    summary: { total: items.length, silent, needsYou, drafted },
    text: `${items.length} emails in. ${silent} handled quietly. ${drafted ? `${drafted} refund case${drafted > 1 ? 's' : ''} ready to file. ` : ''}${needsYou ? `${needsYou} needs you.` : 'Nothing needs you.'}`.trim(),
  };
}

export const learnedBefore = (learnings, now) => learnings.filter(l => toDate(l.learnedAt) <= toDate(now));
