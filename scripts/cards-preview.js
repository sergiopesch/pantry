#!/usr/bin/env node
// Writes story/cards-preview.html: every Pantry card from the engine's current output, in a frame
// that mimics Grok Bot's Visualize document, in dark and light themes.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PANTRY_EVENT_STATE ??= join(tmpdir(), `pantry-cards-${process.pid}.json`);
const { loadEventWorld, freshEventState, eventSnapshot, eventOptions, requestPayment, debrief, setEvent, importGuestFile, addProvider, confirmPayment } = await import('../src/events/index.js');
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
  // A sample live provider, in the shape Pantry adds from a real menu page. Preview only.
  addProvider(st, {
    name: 'Sample Kitchen', tier: 'caterer', source: 'https://example.com/catering-menu', allergens: 'sealed-labelled',
    fulfilment: { type: 'delivery', fee: 20, leadHours: 24 }, minOrder: 150, reviews: { rating: 4.6, count: 312, source: 'https://example.com/reviews' },
    dishes: [
      { name: 'Chicken shawarma bowl', price: 9.5, tags: ['meat', 'halal', 'gluten-free', 'nut-free'] },
      { name: 'Harissa cauliflower bowl', price: 9, tags: ['vegan', 'gluten-free', 'coeliac-safe', 'nut-free', 'sealed'] },
      { name: 'Teriyaki salmon bowl', price: 10.5, tags: ['fish', 'gluten-free', 'nut-free'] },
      { name: 'Falafel wrap', price: 7.5, tags: ['vegan', 'nut-free'] },
      { name: 'Halloumi salad', price: 8, tags: ['vegetarian', 'gluten-free', 'nut-free'] },
      { name: 'Sesame noodle box', price: 7, tags: ['vegan'] },
      { name: 'Lentil dal box', price: 8.5, tags: ['vegan', 'gluten-free', 'nut-free'] },
    ],
  });
  st.inboxAddress = 'pantry@example.com';
  return st;
};
const state = fresh();
const world = await loadEventWorld(state);
const snap = eventSnapshot(world, state);
const opts = eventOptions(world, state).options;
const pending = (() => { const st = fresh(); return { st, a: requestPayment(world, st) }; })();
const approved = (() => { const st = fresh(); const a = requestPayment(world, st); a.payment = { processor: 'agentcard', status: 'awaiting-settlement', sandbox: true, card: { brand: 'Visa', last4: '4242' }, reference: 'ac_sbx_7Hq2' }; return a; })();
const paid = (() => { const st = fresh(); const a = requestPayment(world, st); return confirmPayment(world, st, { approvalId: a.id, reference: 'ac_sbx_7Hq2', amount: a.amount, status: 'paid', processor: 'agentcard', card: { brand: 'Visa', last4: '4242' }, sandbox: true }).approval; })();
const extras = {
  options: { options: opts },
  order: { plan: snap.plan, approval: pending.a },
  payment: { approval: pending.a },
  debrief: debrief(world, fresh(), { attended: Math.round(snap.headcount.signedUp * 0.63), leftoverPct: 8, rating: 4.7, provider: snap.plan.chosen?.id }),
  memory: { finding: 'Hearth & Co billed £70 over the quote in April, for a service-staff line nobody agreed to.', date: '2026-04-23' },
};
const known = world.providers;
const cards = [
  ...CARD_KINDS.filter(k => k !== 'provider').map(k => card(k, snap, extras[k])),
  ...opts.map((o, i) => ({ ...card('provider', snap, { option: o, provider: known.find(p => p.id === o.id) }), kind: `provider-${i + 1}` })),
  { ...card('payment', snap, { approval: approved }), kind: 'payment-approved' },
  { ...card('payment', snap, { approval: paid }), kind: 'payment-paid' },
];

// Grok's Visualize document, as built in its renderer (chunk-visualization-document): the fragment goes
// in <main> inside a body with 20 px padding and default paragraph margins.
const GROK_BASE = 'html{color-scheme:light;overflow:hidden}html[data-theme="dark"]{color-scheme:dark}html,body{margin:0;background:transparent}*{box-sizing:border-box}body{overflow:visible;padding:20px;color:var(--sand-text-primary);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:20px}main{display:block;width:100%}p{margin:4px 0 8px}p:first-child{margin-top:0}p:last-child{margin-bottom:0}';
const THEMES = {
  dark: '--sand-text-primary:#f5f5f5;--sand-bg-chrome:#0d0d0d',
  light: '--sand-text-primary:#141414;--sand-bg-chrome:#ffffff',
};
const doc = (c, theme) => `<!DOCTYPE html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><style>:root{${THEMES[theme]}}</style><style>${GROK_BASE}</style></head><body><main>${c.html}</main></body></html>`;
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const col = (theme, page) => `<div class="col" style="background:${page}"><h2 style="color:${page === '#ffffff' ? '#666' : '#888'}">Grok ${theme} theme · page ${page}</h2>${cards.map(c => `<figure id="${theme}-${c.kind}"><figcaption style="color:${page === '#ffffff' ? '#666' : '#888'}">${esc(c.kind)} · ${esc(c.title)} · ${(c.html.length / 1024).toFixed(1)} KB</figcaption><iframe sandbox="allow-same-origin" srcdoc="${attr(doc(c, theme))}"></iframe></figure>`).join('')}</div>`;
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Pantry cards preview</title><style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#808080}
.wrap{display:grid;grid-template-columns:1fr 1fr}
.col{padding:24px}
h2{margin:0 0 16px;font:600 12px -apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase}
figure{margin:0 0 24px}
figcaption{font:12px ui-monospace,monospace;margin:0 0 8px}
iframe{display:block;width:100%;border:0;height:200px;background:transparent}
</style></head><body><p style="color:#fff;font:12px -apple-system,sans-serif;margin:16px 24px 0">Preview: every card from the engine's current output, each inside an iframe built like Grok's Visualize document. The event is a preview event a week from now; the inbox emails, Sample Kitchen and the Agentcard sandbox states are samples.</p><div class="wrap">${col('light', '#ffffff')}${col('dark', '#0d0d0d')}</div>
<script>for (const f of document.querySelectorAll('iframe')) { const fit = () => { const d = f.contentDocument; if (d && d.body) f.style.height = d.documentElement.scrollHeight + 'px'; }; f.addEventListener('load', () => { fit(); setTimeout(fit, 1300); }); }</script></body></html>`;
const out = fileURLToPath(new URL('../story/cards-preview.html', import.meta.url));
writeFileSync(out, html);
console.log(`${cards.length} cards → ${out}`);
