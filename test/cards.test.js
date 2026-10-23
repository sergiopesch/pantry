import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { card, CARD_KINDS } from '../src/events/cards.js';
import { addProvider, confirmPayment, debrief, eventOptions, eventSnapshot, freshEventState, importGuestFile, loadEventWorld, requestPayment, setEvent } from '../src/events/index.js';

const GUESTS = readFileSync(new URL('../data/events/guests.csv', import.meta.url), 'utf8');
const start = new Date(Date.now() + 7 * 86_400_000).toISOString();
const fresh = () => {
  const s = freshEventState();
  setEvent(s, { name: 'Test <Hack> & "Co"', start, budget: { total: 1000 }, venue: { name: 'Hall' } });
  importGuestFile(s, GUESTS);
  s.inbox = [{ id: 'i1', kind: 'sponsor', from: 'x@example.com', receivedAt: start, subject: 'PO <needed>', body: 'Need a PO.' }];
  addProvider(s, {
    name: 'Test <Kitchen>', tier: 'caterer', source: 'https://www.example.com/menu', allergens: 'sealed-labelled',
    fulfilment: { type: 'delivery', fee: 20, leadHours: 24 }, minOrder: 150, reviews: { rating: 4.6, count: 312 },
    dishes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n, i) => ({ name: `Bowl ${n}`, price: 8 + i / 10, tags: i === 0 ? ['vegan', 'gluten-free', 'coeliac-safe', 'nut-free', 'sealed'] : ['vegan', 'gluten-free', 'nut-free'] })),
  });
  return s;
};
const state = fresh();
const world = await loadEventWorld(state);
const snap = eventSnapshot(world, state);
const opts = eventOptions(world, state).options;
const extras = {
  options: { options: opts },
  provider: { option: opts.find(o => o.live) ?? opts[0], provider: world.providers.find(p => p.live) },
  order: { plan: snap.plan },
  payment: { approval: requestPayment(world, fresh()) },
  debrief: debrief(world, fresh(), { attended: 80, leftoverPct: 10, rating: 4.5 }),
  memory: { finding: 'Billed £70 over <quote>.', date: '2026-04-23' },
};
const all = CARD_KINDS.map(k => card(k, snap, extras[k]));
const gbp = n => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('every kind renders a small, script-free fragment with a title and alt text', () => {
  assert.deepEqual(CARD_KINDS, ['dish', 'headcount', 'diets', 'options', 'provider', 'plan', 'order', 'inbox', 'payment', 'debrief', 'memory']);
  for (const c of all) {
    assert.ok(c.title && c.alt && /<section id="pantry-card" class="pc[ "]/.test(c.html), c.kind);
    assert.equal((c.html.match(/id="pantry-card"/g) ?? []).length, 1, `${c.kind}: one #pantry-card root`);
    assert.ok(!/<script/i.test(c.html), `${c.kind} has a script`);
    assert.ok(!/italic|font-style:\s*(?!normal)/i.test(c.html), `${c.kind} uses italics`);
    assert.ok(c.html.length < 20_000, `${c.kind} is ${c.html.length} bytes`);
    assert.ok(!/https?:\/\//.test(c.html), `${c.kind} loads something external`);
  }
});

test('numbers on the cards are the engine numbers', () => {
  const by = k => all.find(c => c.kind === k);
  assert.match(by('headcount').html, new RegExp(`class="hero">${snap.headcount.planFor}<`));
  assert.match(by('headcount').alt, new RegExp(`${snap.headcount.signedUp} signed up`));
  assert.ok(by('plan').html.includes(gbp(snap.plan.chosen.cost.total)));
  assert.ok(by('payment').html.includes(gbp(extras.payment.approval.amount)));
  assert.match(by('payment').html, /Needs your approval/);
  assert.match(by('diets').html, new RegExp(`class="hero">${snap.diets.declared}<`));
  assert.match(by('debrief').html, /class="hero">80</);
});

test('text from guests, mail and memory is escaped', () => {
  const html = all.map(c => c.html).join('');
  assert.ok(!html.includes('<needed>') && html.includes('PO &lt;needed&gt;'));
  assert.ok(!html.includes('<quote>') && html.includes('&lt;quote&gt;'));
  assert.ok(!html.includes('<Hack>'));
});

test('unknown kinds fail loudly', () => {
  assert.throws(() => card('pie', snap), /No card "pie"/);
});

test('a provider card shows the source domain, the verdict, at most six dishes and the total', () => {
  const o = extras.provider.option;
  const c = card('provider', snap, extras.provider);
  assert.ok(c.html.includes('example.com') && !c.html.includes('https://'), 'domain as text, no link');
  assert.match(c.html, o.eligible ? /Safe for everyone/ : /Out</);
  assert.equal((c.html.match(/class="dish"/g) ?? []).length, 6);
  assert.match(c.html, /\+2 more/);
  assert.ok(c.html.includes(gbp(o.cost.total)));
  assert.match(c.html, /4\.6<\/b>312 reviews/);
  assert.ok(c.html.includes('Test &lt;Kitchen&gt;'));
  const out = opts.find(x => !x.eligible);
  if (out) assert.ok(card('provider', snap, { option: out }).html.includes(out.excluded[0].replace(/&/g, '&amp;').replace(/'/g, '&#39;')));
  assert.throws(() => card('provider', snap, {}), /needs extra.option/);
});

test('the order card lists every line by lane and adds up to the plan', () => {
  const c = card('order', snap, extras.order);
  const p = snap.plan.chosen;
  assert.equal((c.html.match(/class="item"/g) ?? []).length, p.lines.length);
  assert.ok(c.html.includes(gbp(p.cost.total)));
  assert.ok(c.html.includes(gbp(snap.plan.budget.total - p.cost.total)));
});

test('the payment card tracks Agentcard from request to paid, and never shows a card number', () => {
  const st = fresh();
  const a = requestPayment(world, st);
  const step = html => (html.match(/class="step (done|now|)"/g) ?? []).map(x => x.match(/"step (\w*)"/)[1]);
  assert.deepEqual(step(card('payment', snap, { approval: a }).html), ['done', 'now', '']);
  a.payment = { processor: 'agentcard', status: 'awaiting-settlement', sandbox: true, card: '4111111111111111' };
  const approved = card('payment', snap, { approval: a }).html;
  assert.deepEqual(step(approved), ['done', 'done', 'now']);
  assert.match(approved, /Agentcard · single-use card · sandbox/);
  assert.ok(!approved.includes('4111111111111111') && approved.includes('•••• 1111'));
  const paid = confirmPayment(world, st, { approvalId: a.id, reference: 'ac_sbx_1', amount: a.amount, status: 'paid' }).approval;
  const html = card('payment', snap, { approval: paid }).html;
  assert.deepEqual(step(html), ['done', 'done', 'done']);
  assert.match(html, /Paid/);
  assert.match(html, /ac_sbx_1/);
});

test('the header dome wears a white chef toque', () => {
  assert.match(all[0].html, /<svg width="16" height="18"[^>]*>.*fill="#fff".*fill="#FF9800"/s);
});

test('cards render standalone for a screenshot: no page margins, a 600 px root, motion that settles', () => {
  const html = all[0].html;
  assert.match(html, /html,body,main\{margin:0!important;padding:0!important;background:transparent!important/);
  assert.match(html, /max-width:600px/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{\.pc,\.pc \*,\.pc \*::before\{animation:none!important\}/);
  // Only the current payment step may loop.
  assert.equal((html.match(/infinite/g) ?? []).length, 1);
  assert.match(html, /\.step\.now::before\{[^}]*infinite/);
});

test('dish card: one meal of the plan, its plates by lane and who it is safe for', async () => {
  const { card } = await import('../src/events/cards.js');
  const option = { name: 'Kitchen', lines: [
    { key: 'vegan:a', lane: 'vegan', dish: 'a', name: 'Cauliflower bowl', tags: ['vegan', 'coeliac-safe', 'nut-free', 'sealed'], price: 9.5, qty: 13 },
    { key: 'allergy-safe:a', lane: 'allergy-safe', dish: 'a', name: 'Cauliflower bowl', tags: ['vegan', 'coeliac-safe', 'nut-free', 'sealed'], price: 9.5, qty: 6 },
  ] };
  const c = card('dish', {}, { option, dish: 'cauliflower' });
  assert.match(c.html, /19 plates/);
  assert.match(c.alt, /safe for vegans, coeliacs, nut allergies/);
  assert.ok(!/<script/i.test(c.html));
});

test('a meal card says who it feeds, from the plan', async () => {
  const { card } = await import('../src/events/cards.js');
  const option = { name: 'Kitchen', lines: [
    { key: 'allergy-safe:c', lane: 'allergy-safe', dish: 'c', name: 'Curry meal', tags: ['coeliac-safe', 'sealed'], price: 14, qty: 2, serves: [{ needs: ['coeliac', 'gluten-free'], signedUp: 2, plates: 2, extra: 0, critical: true }] },
    { key: 'vegan:v', lane: 'vegan', dish: 'v', name: 'Vegan platter', tags: ['vegan'], price: 4.67, qty: 10, serves: [{ needs: ['vegan'], signedUp: 13, plates: 10, extra: 2, critical: false, ranOut: 'Thursday 26 March' }] },
  ] };
  const curry = card('dish', {}, { option, dish: 'curry' });
  assert.match(curry.alt, /2 for the 2 coeliac guests, one sealed plate each/);
  const vegan = card('dish', {}, { option, dish: 'Vegan platter' });
  assert.match(vegan.alt, /10 for 13 vegan sign-ups/);
  assert.match(vegan.html, /\+2 spare vegan: it ran out on Thursday 26 March/);
});

test('a deposit receipt shows the balance, the masked card and the dollar charge', async () => {
  const { card } = await import('../src/events/cards.js');
  const approval = { id: 'apr_1', kind: 'deposit', status: 'charged', merchant: 'Vanda\'s Kitchen', amount: 70, total: 480.5, balance: 410.5,
    payment: { processor: 'agentcard', sandbox: true, status: 'paid', card: 'Visa 4111111111114783', reference: 'txn_1', usd: 93.63, rate: 1.3376 } };
  const c = card('payment', { event: { name: 'Hack Night' } }, { approval });
  assert.match(c.html, /deposit/);
  assert.match(c.html, /£410\.50 on their invoice/);
  assert.match(c.html, /Visa •••• 4783 · closed/);
  assert.ok(!c.html.includes('4111111111114783'));
  assert.match(c.html, /\$93\.63 · £1 = \$1\.3376/);
});

test('cards render to PNG at 2x, clipped to the card, with no dependencies', async t => {
  const { findChrome, renderCards } = await import('../src/events/png.js');
  try { findChrome(); } catch { return t.skip('no Chrome on this computer'); }
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { card } = await import('../src/events/cards.js');
  const memory = card('memory', null, { finding: 'Hearth & Co billed £70 over quote.', date: '2026-04-23' });
  const [file] = await renderCards([{ name: 'memory', html: memory.html }], mkdtempSync(join(tmpdir(), 'pantry-png-')));
  const png = readFileSync(file);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200); // 600 CSS px at 2x
  assert.ok(png.readUInt32BE(20) > 100 && png.readUInt32BE(20) < 1200);
});
