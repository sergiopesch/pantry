#!/usr/bin/env node
// Dummy history for the organiser: ten past events plus tonight's, as the documents an organiser
// actually has. That means a Luma guest CSV export per event (works on any Luma plan; no Luma Plus
// needed), the provider's quote and invoice or receipt, and the organiser's debrief notes with the
// Luma feedback survey.
// Writes:
//   data/events/archive/<date>-<slug>/  event.json, luma-guests.csv, quote.md, invoice.md, debrief.md
//   data/events/guests.csv              tonight's Luma export
//   data/events/history.json            Pantry's structured ledger, the same facts as the documents
// Everything is made up and deterministic. Supermarket names are real; their prices are estimates.
// Caterers and restaurants are fictional.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../data/events/', import.meta.url));
const providers = Object.fromEntries(JSON.parse(readFileSync(`${ROOT}providers.json`, 'utf8')).providers.map(p => [p.id, p]));

let seed = 20261022;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = xs => xs[Math.floor(rand() * xs.length)];
const shuffle = xs => {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
};
const code = n => Array.from({ length: n }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789')).join('');
const money = n => `£${n.toFixed(2)}`;
const r2 = n => Math.round(n * 100) / 100;

const QUESTION = 'Any dietary requirements or allergies?';
const FIRST = ['Ada', 'Ben', 'Chloe', 'Dev', 'Elif', 'Femi', 'Grace', 'Hiro', 'Isla', 'Jonah', 'Kemi', 'Liam', 'Maya', 'Nikhil', 'Olu', 'Priya', 'Quinn', 'Rosa', 'Sami', 'Tara', 'Uma', 'Vik', 'Wren', 'Xan', 'Yusuf', 'Zoe', 'Aria', 'Bilal', 'Cora', 'Dami'];
const LAST = ['Adeyemi', 'Brooks', 'Chen', 'Dawson', 'Evans', 'Fischer', 'Gupta', 'Hughes', 'Ibrahim', 'Jones', 'Khan', 'Lopez', 'Moreau', 'Novak', 'Okafor', 'Patel', 'Quinn', 'Rossi', 'Singh', 'Tanaka', 'Usman', 'Varga', 'Walsh', 'Young', 'Zielinski', 'Mensah'];
const NONE = ['', 'None', 'none', 'N/A', 'no', 'Nope, anything', 'No requirements'];
// How people actually type it, per 140 approved guests. Each event scales this mix.
const MIX = [
  [70, NONE],
  [19, ['Vegetarian', 'vegetarian', 'veggie', 'Vegetarian please']],
  [13, ['Vegan', 'vegan', 'Vegan (strict)', 'plant based']],
  [4, ['Pescatarian', 'pescatarian - fish ok']],
  [9, ['Halal', 'halal', 'Halal only please']],
  [5, ['Gluten free', 'gluten-free', 'GF please']],
  [2, ['Coeliac', 'coeliac - strict gluten free']],
  [4, ['Dairy free', 'lactose intolerant']],
  [3, ['Nut allergy (severe)', 'Peanut and tree nut allergy', 'allergic to nuts']],
  [1, ['Vegan, no nuts please']],
  [6, ['No pork', 'no pork please']],
  [4, ['No spicy food', 'not too spicy']],
];
const FEEDBACK = {
  good: ['Food was great, thanks!', 'Loved the food', 'Really well organised', 'Great vibe and good food', 'The labels on the food were super helpful'],
  meh: ['Food was ok', 'Bit of a queue for food', 'Fine', 'Could have had more options'],
  bad: ['Nothing left for vegans by the time I got there', 'Food arrived late', 'Not much I could eat', 'A lot of food went to waste'],
};

// The organiser's ten past events, oldest first. orderedFor is what they asked the provider for.
const EVENTS = [
  { date: '2026-01-22', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 64, attended: 41, provider: 'sainsburys', orderedFor: 64, leftoverPct: 0.33, rating: 3.7, minsLate: 0, ranOut: [], story: 'First one. Ordered for everyone who signed up; a third of the wraps went home with volunteers.' },
  { date: '2026-02-19', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 80, attended: 44, provider: 'slice-theory', orderedFor: 80, leftoverPct: 0.38, rating: 3.5, minsLate: 10, ranOut: ['gluten-free'], story: 'Pizza for 80, 44 came. Only two gluten-free pizzas and the coeliac guest could not eat them (shared oven).' },
  { date: '2026-03-12', name: 'Agents Workshop', kind: 'workshop', ticket: 'paid', price: 10, approved: 40, attended: 36, provider: 'mands', orderedFor: 40, leftoverPct: 0.1, rating: 4.3, minsLate: 0, ranOut: [], story: 'Paid tickets, so nearly everyone came. M&S platters, collected by Dami. 25 minutes each way in the rain.' },
  { date: '2026-03-26', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 88, attended: 47, provider: 'bao-down', orderedFor: 60, leftoverPct: 0.12, rating: 3.8, minsLate: 0, ranOut: ['vegan'], story: 'Tofu bao gone in twenty minutes. Nine vegans that night, ordered for five.' },
  { date: '2026-04-23', name: 'London AI Hack Day', kind: 'hackathon', ticket: 'free', approved: 160, attended: 101, provider: 'hearth-and-co', orderedFor: 120, leftoverPct: 0.15, rating: 4.4, minsLate: 0, ranOut: [], surcharge: 70, story: 'Excellent hot food. The invoice came in £70 over the quote: a "service staff" line nobody agreed to.' },
  { date: '2026-05-21', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 92, attended: 50, provider: 'mezze-collective', orderedFor: 60, leftoverPct: 0.14, rating: 3.9, minsLate: 0, ranOut: [], incident: 'The falafel platter labelled vegan came with a yoghurt dip on the side. Two vegan guests flagged it.', story: 'Good spread, generous portions. One labelling slip on the vegan platter.' },
  { date: '2026-06-18', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 96, attended: 51, provider: 'slice-theory', orderedFor: 96, leftoverPct: 0.41, rating: 3.6, minsLate: 0, ranOut: ['vegan'], story: 'Ordered to the sign-up count again. Forty percent in the bin, and the vegan pizzas were gone by 19:10.' },
  { date: '2026-07-16', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 118, attended: 66, provider: 'sainsburys', orderedFor: 80, leftoverPct: 0.18, rating: 3.9, minsLate: 0, ranOut: ['gluten-free'], story: 'Wraps and platters. Good value; the gluten-free wraps were too few.' },
  { date: '2026-08-20', name: 'Grok Builders Meetup', kind: 'meetup', ticket: 'free', approved: 104, attended: 61, provider: 'hearth-and-co', orderedFor: 70, leftoverPct: 0.12, rating: 4.4, minsLate: 25, ranOut: [], story: 'Food was excellent. Arrived 25 minutes late; the room waited.' },
  { date: '2026-09-24', name: 'Agents Hack Night', kind: 'hackathon', ticket: 'free', approved: 150, attended: 93, provider: 'little-feast', orderedFor: 100, leftoverPct: 0.09, rating: 4.6, minsLate: 0, ranOut: [], story: 'Labelled bowls, every diet named on the lid. Best night so far.' },
];
const TONIGHT = { date: '2026-10-22', name: 'Grok Bot Community Hackathon', kind: 'hackathon', ticket: 'free', approved: 140, attended: 0, waitlist: 12, declined: 4 };

function answers(n) {
  const out = MIX.flatMap(([k, forms]) => Array.from({ length: Math.round((k * n) / 140) }, () => pick(forms)));
  while (out.length < n) out.push(pick(NONE));
  return shuffle(out.slice(0, n));
}

// Luma's guest CSV export. The column layout follows Luma's export; check it against a real one.
const HEADER = ['api_id', 'name', 'first_name', 'last_name', 'email', 'phone_number', 'created_at', 'approval_status', 'checked_in_at', 'amount', 'currency', 'ticket_name', 'survey_response_rating', 'survey_response_feedback', QUESTION];
const csvCell = v => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function guestCsv(e) {
  const diet = answers(e.approved);
  const statuses = [...diet.map(a => ['approved', a]), ...Array.from({ length: e.waitlist ?? 0 }, () => ['waitlist', pick(NONE)]), ...Array.from({ length: e.declined ?? 0 }, () => ['declined', ''])];
  const came = new Set(shuffle(diet.map((_, i) => i)).slice(0, e.attended));
  // About 40% of attendees answer the feedback survey; their average lands on the event's rating.
  const used = new Set();
  const rows = statuses.map(([status, answer], i) => {
    let f;
    let l;
    do (f = pick(FIRST)), (l = pick(LAST)); while (used.has(f + l) && used.size < 700);
    used.add(f + l);
    const doors = new Date(`${e.date}T18:00:00+01:00`);
    const checkedIn = status === 'approved' && came.has(i) ? new Date(doors.getTime() + Math.floor(rand() * 75) * 60_000).toISOString() : '';
    let rating = '';
    let feedback = '';
    if (checkedIn && rand() < 0.4) {
      const r = Math.max(1, Math.min(5, Math.round(e.rating + (rand() - 0.5) * 2)));
      rating = String(r);
      if (rand() < 0.5) feedback = pick(r >= 4 ? FEEDBACK.good : r === 3 ? FEEDBACK.meh : FEEDBACK.bad);
    }
    return [`gst-${code(10)}`, `${f} ${l}`, f, l, `${f}.${l}.${i}@guest.example`.toLowerCase(), '', new Date(doors.getTime() - (2 + Math.floor(rand() * 21)) * 86_400_000).toISOString(),
      status, checkedIn, e.price ? e.price.toFixed(2) : '0.00', 'GBP', 'General admission', rating, feedback, answer];
  });
  return [HEADER, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n';
}

// What was ordered: one plate each for orderedFor, split by the event's declared needs.
function order(e) {
  const p = providers[e.provider];
  const vegan = p.dishes.find(d => d.tags.includes('vegan')) ?? p.dishes[0];
  const gf = p.dishes.find(d => d.tags.includes('coeliac-safe')) ?? p.dishes.find(d => d.tags.includes('gluten-free'));
  const general = p.dishes.filter(d => d !== gf && !d.tags.includes('sealed'));
  const veganQty = e.ranOut.includes('vegan') ? Math.round(e.orderedFor * 0.055) : Math.round(e.orderedFor * 0.1);
  const gfQty = gf ? (e.ranOut.includes('gluten-free') ? 2 : Math.max(2, Math.round(e.orderedFor * 0.05))) : 0;
  const lines = [{ name: `${vegan.name} (vegan)`, qty: veganQty, price: vegan.price }];
  if (gf) lines.push({ name: `${gf.name} (gluten-free)`, qty: gfQty, price: gf.price });
  let rest = e.orderedFor - veganQty - gfQty;
  general.forEach((d, i) => {
    const q = i === general.length - 1 ? rest : Math.round(rest / (general.length - i));
    rest -= q;
    lines.push({ name: d.name, qty: q, price: d.price });
  });
  if (p.extras?.perHead) lines.push({ name: p.extras.label, qty: e.orderedFor, price: p.extras.perHead });
  const fee = p.fulfilment.fee ?? 0;
  if (fee) lines.push({ name: p.fulfilment.type === 'delivery' ? 'Delivery' : 'Collection', qty: 1, price: fee });
  return { p, lines: lines.filter(l => l.qty > 0) };
}

const table = lines => ['| Item | Qty | Unit | Amount |', '|---|---:|---:|---:|', ...lines.map(l => `| ${l.name} | ${l.qty} | ${money(l.price)} | ${money(l.qty * l.price)} |`)].join('\n');

function documents(e, folder, n) {
  const { p, lines } = order(e);
  const subtotal = r2(lines.reduce((s, l) => s + l.qty * l.price, 0));
  const supermarket = p.tier === 'supermarket';
  // Prices include VAT, as on the providers' price lists; invoices break the 20% out.
  const quoteTotal = supermarket ? null : subtotal;
  const invoiceLines = e.surcharge ? [...lines, { name: 'Service staff (2 × 2 hrs)', qty: 1, price: e.surcharge }] : lines;
  const total = r2(invoiceLines.reduce((s, l) => s + l.qty * l.price, 0));
  const net = r2(total / 1.2);
  const ref = `${p.id.slice(0, 3).toUpperCase()}-${e.date.replace(/-/g, '')}-${String(n).padStart(2, '0')}`;
  const header = `**Event:** ${e.name}, ${e.date}\n**Bill to:** Sergio (organiser), Grok Builders London\n**Provider:** ${p.name}${p.example ? ' (fictional example provider)' : ''}\n`;
  if (!supermarket) {
    writeFileSync(`${folder}/quote.md`, `# Quote ${ref}-Q\n\n${header}**Quoted:** ${new Date(new Date(e.date).getTime() - 6 * 86_400_000).toISOString().slice(0, 10)} · valid 14 days\n\nPrices include VAT.\n\n${table(lines)}\n\n| | |\n|---|---:|\n| Net | ${money(r2(quoteTotal / 1.2))} |\n| VAT 20% | ${money(r2(quoteTotal - quoteTotal / 1.2))} |\n| **Total** | **${money(quoteTotal)}** |\n\nDrop: by 18:00 at the venue. Allergen sheet on request.\n`);
  }
  const vat = supermarket ? 'VAT included where applicable.' : `| Net | ${money(net)} |\n| VAT 20% | ${money(total - net)} |\n`;
  writeFileSync(`${folder}/invoice.md`, `# ${supermarket ? 'Order receipt' : 'Invoice'} ${ref}\n\n${header}**Date:** ${e.date} · **Paid:** card\n\n${table(invoiceLines)}\n\n${supermarket ? `**Total: ${money(total)}**\n\n${vat}` : `| | |\n|---|---:|\n${vat}| **Total** | **${money(total)}** |`}\n${p.fulfilment.type === 'collection' ? '\nCollected in store.\n' : ''}`);
  const survey = e.rating;
  writeFileSync(`${folder}/debrief.md`, `# Debrief: ${e.name}, ${e.date}\n\n- Signed up on Luma: ${e.approved}\n- Checked in: ${e.attended} (${Math.round((e.attended / e.approved) * 100)}%)\n- Ordered for: ${e.orderedFor}\n- Provider: ${p.name}, ${money(total)}${quoteTotal ? ` (quoted ${money(quoteTotal)})` : ''}\n- Arrived: ${e.minsLate ? `${e.minsLate} minutes late` : 'on time'}\n- Left over: about ${Math.round(e.leftoverPct * 100)}%\n- Ran out: ${e.ranOut.length ? e.ranOut.join(', ') : 'nothing'}\n- Luma feedback survey: ${survey.toFixed(1)} out of 5\n${e.incident ? `- Incident: ${e.incident}\n` : ''}${e.surcharge ? `- Invoice: £${e.surcharge} "service staff" line not on the quote. Paid it; asked them to put it in writing next time.\n` : ''}\nNotes: ${e.story}\n`);
  return { ref, total, quoteTotal };
}

rmSync(`${ROOT}archive`, { recursive: true, force: true });
const ledger = [];
EVENTS.forEach((e, i) => {
  const folder = `${ROOT}archive/${e.date}-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  mkdirSync(folder, { recursive: true });
  const lumaEventId = `evt-${code(12)}`;
  writeFileSync(`${folder}/event.json`, JSON.stringify({ lumaEventId, name: e.name, kind: e.kind, ticket: e.ticket, date: e.date, doors: `${e.date}T18:00:00+01:00`, venue: 'Expedite London HQ' }, null, 2) + '\n');
  writeFileSync(`${folder}/luma-guests.csv`, guestCsv(e));
  const doc = documents(e, folder, i + 1);
  ledger.push({ lumaEventId, date: e.date, orderedFor: e.orderedFor, provider: e.provider, spend: doc.total, quoted: doc.quoteTotal, invoice: doc.ref, onTime: !e.minsLate, minsLate: e.minsLate, leftoverPct: e.leftoverPct, rating: e.rating, ranOut: e.ranOut, notes: [e.story, e.incident, e.surcharge && `Invoice £${e.surcharge} over the quote (service staff).`].filter(Boolean).join(' ') });
});
writeFileSync(`${ROOT}guests.csv`, guestCsv({ ...TONIGHT, rating: 4 }));
writeFileSync(`${ROOT}history.json`, JSON.stringify({ note: "Pantry's catering ledger, one entry per past event: the same facts as the documents in archive/. Dummy data. Caterers and restaurants are fictional; supermarket prices are estimates.", events: ledger }, null, 2) + '\n');
console.log(ledger.map(l => `${l.date}  ${l.provider.padEnd(17)} ${String(l.spend).padStart(8)}  ${l.invoice}`).join('\n'));
