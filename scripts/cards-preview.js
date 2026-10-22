#!/usr/bin/env node
// Writes story/cards-preview.html: every Pantry card from the engine's current output, in a frame
// that mimics Grok Bot's Visualize document, in dark and light themes.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PANTRY_EVENT_STATE ??= join(tmpdir(), `pantry-cards-${process.pid}.json`);
const { loadEventWorld, freshEventState, eventSnapshot, eventOptions, requestPayment, debrief, setEvent, importGuestFile } = await import('../src/events/index.js');
const { card, CARD_KINDS } = await import('../src/events/cards.js');
const { readFileSync } = await import('node:fs');

// A preview event a week from now, the way the bot sets one from Notion, with tonight's Luma export.
const GUESTS = readFileSync(fileURLToPath(new URL('../data/events/guests.csv', import.meta.url)), 'utf8');
const start = new Date(Date.now() + 7 * 86_400_000);
start.setUTCHours(17, 0, 0, 0);
const SAMPLE_INBOX = [
  { id: 'p1', kind: 'guest-question', from: 'Guest <guest@example.com>', receivedAt: new Date().toISOString(), subject: 'Coeliac: will there be something safe?', body: "I'm coeliac (strict). Will there be anything I can eat?" },
  { id: 'p2', kind: 'sponsor', from: 'Sponsor <events@example.com>', receivedAt: new Date().toISOString(), subject: 'Catering invoice', body: 'Can the caterer invoice us directly? We need a PO number on it.' },
  { id: 'p3', kind: 'promo', from: 'Supplies <deals@example.com>', receivedAt: new Date().toISOString(), subject: '30% off balloons', body: 'Balloons.' },
];
const fresh = () => {
  const st = freshEventState();
  setEvent(st, { name: 'Grok Bot Community Hackathon', start: start.toISOString(), budget: { total: 1000 }, venue: { name: 'Preview venue' } });
  importGuestFile(st, GUESTS);
  st.inbox = SAMPLE_INBOX;
  st.inboxAddress = 'pantry@example.com';
  return st;
};
const state = fresh();
const world = await loadEventWorld(state);
const snap = eventSnapshot(world, state);
const extras = {
  options: { options: eventOptions(world, state).options },
  payment: { approval: requestPayment(world, fresh()) },
  debrief: debrief(world, fresh(), { attended: Math.round(snap.headcount.signedUp * 0.63), leftoverPct: 8, rating: 4.7, provider: snap.plan.chosen?.id }),
  memory: { finding: 'Hearth & Co billed £70 over the quote in April, for a service-staff line nobody agreed to.', date: '2026-04-23' },
};
const cards = CARD_KINDS.map(k => card(k, snap, extras[k]));

const THEMES = {
  dark: '--sand-text-primary:#f5f5f5;--sand-text-secondary:#f5f5f5a8;--sand-text-tertiary:#f5f5f570;--sand-bg-elevated:#1a1a1a;--sand-bg-secondary:#ffffff0f;--sand-bg-chrome:#0d0d0d;--sand-border-tertiary-translucent:#ffffff14;--sand-text-success-primary:#3ddc97;--sand-text-danger-primary:#ff5a6a;--sand-text-warn-primary:#ffb340;--sand-dataviz-0:#4c9dff;--sand-dataviz-1:#2ad1c0;--sand-dataviz-2:#3ddc97;--sand-dataviz-3:#a682ff;--sand-dataviz-4:#ff5cae;--sand-dataviz-5:#c08a5a;--sand-dataviz-6:#9a9a9a;--sand-dataviz-7:#ff5a6a',
  light: '--sand-text-primary:#141414;--sand-text-secondary:#14141499;--sand-text-tertiary:#14141466;--sand-bg-elevated:#ffffff;--sand-bg-secondary:#0000000a;--sand-bg-chrome:#f2f2f2;--sand-border-tertiary-translucent:#00000014;--sand-text-success-primary:#00a05a;--sand-text-danger-primary:#d61f33;--sand-text-warn-primary:#c76a00;--sand-dataviz-0:#1084fe;--sand-dataviz-1:#00a896;--sand-dataviz-2:#00a05a;--sand-dataviz-3:#7a45f0;--sand-dataviz-4:#e0207f;--sand-dataviz-5:#936439;--sand-dataviz-6:#777777;--sand-dataviz-7:#d61f33',
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const col = theme => `<div class="col" style="${THEMES[theme]};background:var(--sand-bg-chrome)"><h2>${theme}</h2>${cards.map(c => `<figure id="${theme}-${c.kind}"><figcaption>${esc(c.kind)} · ${esc(c.title)} · ${(c.html.length / 1024).toFixed(1)} KB</figcaption>${c.html}</figure>`).join('')}</div>`;
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Pantry cards preview</title><style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#000}
.wrap{display:grid;grid-template-columns:1fr 1fr}
.col{padding:28px}
h2{margin:0 0 18px;font:600 13px -apple-system,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--sand-text-tertiary)}
figure{margin:0 0 28px}
figcaption{font:12px ui-monospace,monospace;color:var(--sand-text-tertiary);margin:0 0 8px}
</style></head><body><p style="color:#888;font:12px -apple-system,sans-serif;margin:16px 28px 0">Preview: every card from the engine's current output. The event is a preview event a week from now; the inbox emails are samples.</p><div class="wrap">${col('dark')}${col('light')}</div></body></html>`;
const out = fileURLToPath(new URL('../story/cards-preview.html', import.meta.url));
writeFileSync(out, html);
console.log(`${cards.length} cards → ${out}`);
