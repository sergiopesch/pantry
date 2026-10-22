import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState } = await import('../src/data.js');
const { agentcardDriver, approve, charge, decline, requestApproval } = await import('../src/vault.js');

const M = "Sainsbury's";
const t0 = new Date('2026-10-20T19:14:00+01:00');
const ask = (state, amount = 49.56, cartHash = 'abc') => requestApproval(state, { merchant: M, amount, cartHash, now: t0 });

test('no charge without a human approval', () => {
  const state = freshState();
  const a = ask(state);
  assert.throws(() => charge(state, a.id, { merchant: M, amount: 49.56, now: t0 }), { code: 'NOT_APPROVED' });
});

test('the card is locked to one merchant and one amount, and dies after one charge', () => {
  const state = freshState();
  const a = ask(state);
  approve(state, a.id, { now: t0 });
  assert.throws(() => charge(state, a.id, { merchant: 'Somewhere Else', amount: 10, now: t0 }), { code: 'WRONG_MERCHANT' });
  assert.throws(() => charge(state, a.id, { merchant: M, amount: 49.57, now: t0 }), { code: 'OVER_CAP' });
  const receipt = charge(state, a.id, { merchant: M, amount: 49.56, now: t0 });
  assert.equal(receipt.status, 'cleared');
  assert.equal(state.approvals[0].card.state, 'dead');
  assert.throws(() => charge(state, a.id, { merchant: M, amount: 1, now: t0 }), { code: 'NOT_APPROVED' });
});

test('the card expires 12 hours after approval', () => {
  const state = freshState();
  const a = ask(state);
  approve(state, a.id, { now: t0 });
  const later = new Date(t0.getTime() + 12 * 3_600_000 + 1);
  assert.throws(() => charge(state, a.id, { merchant: M, amount: 49.56, now: later }), { code: 'CARD_EXPIRED' });
});

test('an approval request expires after 15 minutes', () => {
  const state = freshState();
  const a = ask(state);
  assert.throws(() => approve(state, a.id, { now: new Date(t0.getTime() + 16 * 60_000) }), { code: 'EXPIRED' });
});

test('asking twice for the same cart is idempotent; a new cart supersedes', () => {
  const state = freshState();
  const a = ask(state);
  assert.equal(ask(state).id, a.id);
  const b = ask(state, 51.0, 'different');
  assert.notEqual(b.id, a.id);
  assert.equal(state.approvals.find(x => x.id === a.id).status, 'superseded');
});

test('declined means declined', () => {
  const state = freshState();
  const a = ask(state);
  decline(state, a.id);
  assert.throws(() => approve(state, a.id, { now: t0 }), { code: 'NOT_PENDING' });
});

test('the Agentcard driver refuses to pretend until it is wired', () => {
  const state = freshState();
  const a = ask(state);
  assert.throws(() => approve(state, a.id, { driver: agentcardDriver, now: t0 }), { code: 'NOT_WIRED' });
  assert.equal(state.approvals[0].status, 'pending');
});

test('every step lands in the audit log', () => {
  const state = freshState();
  const a = ask(state);
  approve(state, a.id, { now: t0 });
  charge(state, a.id, { merchant: M, amount: 49.56, now: t0 });
  assert.deepEqual(state.log.map(l => l.event), ['approval.requested', 'approval.granted', 'charge.cleared']);
});
