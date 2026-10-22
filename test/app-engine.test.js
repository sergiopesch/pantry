import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState, loadWorld } = await import('../src/data.js');
const { approveCheckout, editCart, keepCase, requestCheckout, setClock, snapshot } = await import('../src/pantry.js');

const world = loadWorld();
const book = state => {
  setClock(state, '2026-10-20T19:12:00+01:00');
  const approval = requestCheckout(world, state);
  return approveCheckout(world, state, approval.id);
};

test('the 6:02 AM lock screen carries the nudge', () => {
  const s = snapshot(world, freshState());
  assert.equal(s.notifications[0].id, 'nudge');
  assert.equal(s.notifications[0].body, "Eggs run out Thursday night. Two dozen are in Thursday's 4–6 PM delivery.");
});

test('an order moves from booked to delivered as the household clock moves', () => {
  const state = freshState();
  book(state);
  assert.equal(snapshot(world, state).order.progress.status, 'booked');
  setClock(state, '2026-10-22T13:30:00+01:00');
  assert.equal(snapshot(world, state).order.progress.status, 'picking');
  setClock(state, '2026-10-22T16:20:00+01:00');
  const onWay = snapshot(world, state);
  assert.equal(onWay.order.progress.status, 'on-its-way');
  assert.ok(onWay.notifications.some(n => n.id.endsWith('-way')));
  setClock(state, '2026-10-22T17:48:00+01:00');
  assert.equal(snapshot(world, state).order.progress.status, 'delivered');
});

test('a booked slot cannot be paid for twice', () => {
  const state = freshState();
  book(state);
  assert.throws(() => requestCheckout(world, state), /already booked and paid/);
});

test('a line the human added keeps its own edit through quantity changes', () => {
  const state = freshState();
  editCart(state, '', 'add', 'pizza-pepperoni', 1);
  editCart(state, 'add:pizza-pepperoni', 'qty', undefined, 3);
  let pizza = snapshot(world, state).cart.lines.find(l => l.family === 'pizza');
  assert.equal(pizza.qty, 3);
  editCart(state, 'add:pizza-pepperoni', 'exclude');
  pizza = snapshot(world, state).cart.lines.find(l => l.family === 'pizza');
  assert.equal(pizza, undefined);
});

test('quantities on planned lines replay in the order they were made', () => {
  const state = freshState();
  editCart(state, 'blueberries-150', 'qty', undefined, 3);
  editCart(state, '', 'add', 'blueberries-150', 1);
  assert.equal(snapshot(world, state).cart.lines.find(l => l.family === 'blueberries').qty, 4);
  editCart(state, 'blueberries-150', 'qty', undefined, 2);
  assert.equal(snapshot(world, state).cart.lines.find(l => l.family === 'blueberries').qty, 2, 'the latest absolute quantity wins');
});

test('keeping a substitute is a decision, not an external write', () => {
  const state = freshState();
  const before = snapshot(world, state);
  const sub = before.inbox.items.find(i => i.action === 'needs-you');
  keepCase(world, state, sub.caseId);
  const after = snapshot(world, state);
  assert.equal(after.inbox.summary.needsYou, 0);
  assert.equal(after.inbox.items.find(i => i.id === sub.id).note, 'You kept them. Noted for next time.');
  assert.ok(!state.log.some(l => l.event === 'case.filed'));
});
