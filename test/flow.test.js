import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState, loadWorld } = await import('../src/data.js');
const { acceptOffer, approveCheckout, editCart, fileCase, requestCheckout, snapshot } = await import('../src/pantry.js');
const { agentcardDriver } = await import('../src/vault.js');
const { round2 } = await import('../src/util.js');

const world = loadWorld();

test('checkout, Face ID, charge, booking, confirmation filed quietly', () => {
  const state = freshState();
  const approval = requestCheckout(world, state);
  assert.equal(approval.status, 'pending');
  assert.match(approval.prompt, /^Pantry wants to spend £\d+\.\d{2} at Sainsbury's\.$/);
  const r = approveCheckout(world, state, approval.id);
  assert.equal(r.approval.status, 'charged');
  assert.equal(r.approval.card.state, 'dead');
  assert.equal(r.receipt.amount, approval.amount);
  assert.equal(r.booking.slotId, 'thu-16');
  const s = snapshot(world, state);
  const confirmation = s.inbox.items.find(i => i.id.startsWith('m-confirm'));
  assert.equal(confirmation.action, 'filed');
  assert.equal(confirmation.silent, true);
  assert.equal(s.inbox.summary.total, 7);
  assert.equal(s.order.total, approval.amount);
});

test('changing the cart after the request means asking again', () => {
  const state = freshState();
  const approval = requestCheckout(world, state);
  editCart(state, 'coffee-beans-227', 'exclude');
  assert.throws(() => approveCheckout(world, state, approval.id), { code: 'CART_CHANGED' });
  const again = requestCheckout(world, state);
  assert.ok(again.amount < approval.amount);
});

test('a live vault cannot be approved from the laptop', () => {
  const state = freshState();
  const approval = requestCheckout(world, state);
  assert.throws(() => approveCheckout(world, state, approval.id, { driver: agentcardDriver }), { code: 'APPROVE_ON_PHONE' });
});

test("accepting the six-pack reroutes next week's cart and leaves this week alone", () => {
  const state = freshState();
  const before = snapshot(world, state);
  acceptOffer(world, state, 'nectar-eggs-6');
  const after = snapshot(world, state);
  assert.equal(after.totals.total, before.totals.total);
  assert.equal(round2(before.next.totals.total - after.next.totals.total), 1.1);
  assert.ok(after.next.cart.lines.some(l => l.sku === 'eggs-large-6' && l.qty === 4));
  assert.equal(after.story.deals.accepted, true);
  assert.equal(after.story.deals.done, "Next week's cart: rerouted. £1.10 off.");
});

test('bringing back the pizza is one tap', () => {
  const state = freshState();
  editCart(state, 'pizza-pepperoni', 'include');
  const s = snapshot(world, state);
  assert.ok(s.cart.lines.some(l => l.family === 'pizza' && l.rule === 'human-override'));
  assert.ok(!s.cart.leftOut.some(l => l.family === 'pizza'));
});

test('a drafted case is filed only when the human says so', () => {
  const state = freshState();
  const draft = snapshot(world, state).inbox.cases.find(c => c.kind === 'missing-item');
  assert.equal(draft.status, 'awaiting-approval');
  fileCase(world, state, draft.id);
  const s = snapshot(world, state);
  assert.equal(s.inbox.cases.find(c => c.id === draft.id).status, 'filed');
  assert.equal(s.inbox.summary.drafted, 0);
});
