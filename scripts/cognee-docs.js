#!/usr/bin/env node
// Builds the documents Pantry's memory is made of: one per past event (attendance and declared diets in
// aggregate, anonymous feedback, then the quote, invoice and debrief as written), plus the provider list.
// Guest names and emails never leave the computer; only counts and unattributed feedback do.
// Writes data/events/cognee/*.md for scripts/cognee-load.py.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseCsv, importGuests, NEEDS } from '../src/events/luma.js';

const ROOT = fileURLToPath(new URL('../data/events/', import.meta.url));
const OUT = join(ROOT, 'cognee');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const providers = JSON.parse(readFileSync(join(ROOT, 'providers.json'), 'utf8')).providers;
const ledger = JSON.parse(readFileSync(join(ROOT, 'history.json'), 'utf8')).events;
const name = id => providers.find(p => p.id === id)?.name ?? id;

for (const folder of readdirSync(join(ROOT, 'archive')).sort()) {
  const dir = join(ROOT, 'archive', folder);
  const meta = JSON.parse(readFileSync(join(dir, 'event.json'), 'utf8'));
  const csv = readFileSync(join(dir, 'luma-guests.csv'), 'utf8');
  const { guests } = importGuests(csv);
  const came = guests.filter(g => g.checkedIn);
  const counts = {};
  for (const g of guests) for (const n of g.needs) counts[n] = (counts[n] ?? 0) + 1;
  const rows = parseCsv(csv).filter(r => r.survey_response_rating);
  const avg = rows.length ? (rows.reduce((s, r) => s + Number(r.survey_response_rating), 0) / rows.length).toFixed(1) : 'n/a';
  const feedback = [...new Set(rows.map(r => r.survey_response_feedback).filter(Boolean))];
  const l = ledger.find(x => x.lumaEventId === meta.lumaEventId);
  const read = f => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
  const doc = [
    `# ${meta.name}, ${meta.date} (Luma event ${meta.lumaEventId})`,
    '',
    `A ${meta.ticket} ${meta.kind} run by Sergio (Grok Builders London) at ${meta.venue}. Catered by ${name(l.provider)}.`,
    '',
    '## Attendance (from the Luma guest export)',
    `- Signed up: ${guests.length}`,
    `- Checked in: ${came.length} (${Math.round((came.length / guests.length) * 100)}% of sign-ups)`,
    `- Ordered food for: ${l.orderedFor}`,
    '',
    '## Declared dietary needs (aggregate counts, from the Luma registration question)',
    ...Object.entries(counts).map(([k, v]) => `- ${NEEDS[k].label}: ${v}`),
    '',
    `## Luma feedback survey (${rows.length} responses, average ${avg} out of 5)`,
    ...feedback.map(f => `- "${f}"`),
    '',
    read('quote.md'),
    read('invoice.md'),
    read('debrief.md'),
  ].join('\n');
  writeFileSync(join(OUT, `${folder}.md`), doc);
}

writeFileSync(join(OUT, 'providers.md'), [
  '# Catering providers Pantry knows',
  '',
  'Supermarkets are real brands with estimated prices. Caterers and restaurants are fictional examples.',
  '',
  ...providers.map(p => `## ${p.name} (${p.tier})\n- Fulfilment: ${p.fulfilment.label}, ${p.fulfilment.leadHours} hours' notice, fee £${p.fulfilment.fee}\n- Allergen handling: ${p.allergens}\n- Dishes: ${p.dishes.map(d => `${d.name} (£${d.price}, ${d.tags.join(', ')})`).join('; ')}\n${(p.notes ?? []).map(n => `- ${n}`).join('\n')}`),
].join('\n'));
console.log(readdirSync(OUT).join('\n'));
