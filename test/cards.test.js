import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { card, CARD_KINDS } from '../src/events/cards.js';
import { debrief, eventOptions, eventSnapshot, freshEventState, importGuestFile, loadEventWorld, requestPayment, setEvent } from '../src/events/index.js';

const GUESTS = readFileSync(new URL('../data/events/guests.csv', import.meta.url), 'utf8');
const start = new Date(Date.now() + 7 * 86_400_000).toISOString();
const fresh = () => {
  const s = freshEventState();
  setEvent(s, { name: 'Test <Hack> & "Co"', start, budget: { total: 1000 }, venue: { name: 'Hall' } });
  importGuestFile(s, GUESTS);
  s.inbox = [{ id: 'i1', kind: 'sponsor', from: 'x@example.com', receivedAt: start, subject: 'PO <needed>', body: 'Need a PO.' }];
  return s;
};
const state = fresh();
const world = await loadEventWorld(state);
const snap = eventSnapshot(world, state);
const extras = {
  options: { options: eventOptions(world, state).options },
  payment: { approval: requestPayment(world, fresh()) },
  debrief: debrief(world, fresh(), { attended: 80, leftoverPct: 10, rating: 4.5 }),
  memory: { finding: 'Billed £70 over <quote>.', date: '2026-04-23' },
};
const all = CARD_KINDS.map(k => card(k, snap, extras[k]));
const gbp = n => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('every kind renders a small, script-free fragment with a title and alt text', () => {
  assert.deepEqual(CARD_KINDS, ['headcount', 'diets', 'options', 'plan', 'inbox', 'payment', 'debrief', 'memory']);
  for (const c of all) {
    assert.ok(c.title && c.alt && c.html.includes('class="pc"'), c.kind);
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
