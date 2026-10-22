import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState, loadWorld } = await import('../src/data.js');
const { act, findFamilies, intentOf, say } = await import('../src/chat.js');
const { snapshot, setClock } = await import('../src/pantry.js');

const world = loadWorld();

test('finds products by everyday words, longest phrase first', () => {
  assert.deepEqual(findFamilies("she's asking for blueberries again"), ['blueberries']);
  assert.deepEqual(findFamilies('add sweet potatoes and fish fingers'), ['sweet-potatoes', 'fish-fingers']);
  assert.deepEqual(findFamilies('more cheese please'), ['cheddar']);
});

test('reads intent from plain English', () => {
  assert.equal(intentOf('why no pizza?'), 'why');
  assert.equal(intentOf('no pizza this week'), 'remove');
  assert.equal(intentOf('ok buy it'), 'checkout');
  assert.equal(intentOf("what's running out?"), 'running');
  assert.equal(intentOf('cheaper eggs'), 'swap');
  assert.equal(intentOf('OK, show me the cart'), 'cart');
  assert.equal(intentOf('flibbertigibbet'), 'help');
});

test('adding something really changes the cart', () => {
  const state = freshState();
  const before = snapshot(world, state).cart.lines.find(l => l.family === 'blueberries').qty;
  const r = say(world, state, "she's asking for blueberries again");
  assert.equal(r.answer.text, 'Done. Two punnets of blueberries for Thursday.');
  assert.equal(snapshot(world, state).cart.lines.find(l => l.family === 'blueberries').qty, before + 1);
});

test('treats need a yes, and the yes works', () => {
  const state = freshState();
  const r = say(world, state, 'add pizza');
  assert.match(r.answer.text, /treats are the grown-ups' call\. Add it anyway\?$/);
  assert.equal(r.answer.card.type, 'confirm');
  assert.ok(!snapshot(world, state).cart.lines.some(l => l.family === 'pizza'));
  act(world, state, r.answer.card.actions[0].action);
  const pizza = snapshot(world, state).cart.lines.find(l => l.family === 'pizza');
  assert.equal(pizza.rule, 'human-override');
});

test('explains its choices with the real reasons', () => {
  const state = freshState();
  assert.match(say(world, state, 'why are the bananas loose?').answer.text, /went missing twice \(12 and 19 October\)\. Loose from now on\.$/);
  assert.match(say(world, state, 'why medium eggs?').answer.text, /same twelve, 40p less/);
  assert.match(say(world, state, 'why no pizza?').answer.text, /crept in on Saturday 3 October/);
});

test('"cheaper eggs" picks the cheapest per egg', () => {
  const state = freshState();
  const r = say(world, state, 'cheaper eggs');
  assert.match(r.answer.text, /^Swapped to Free Range British Eggs Medium x15\./);
});

test('check out from chat asks for Face ID and never pays by itself', () => {
  const state = freshState();
  const r = say(world, state, 'ok buy it');
  assert.equal(r.answer.card.type, 'approval');
  assert.equal(snapshot(world, state).approval.status, 'pending');
  assert.equal(state.orders.length, 0);
});

test('the thread follows the household clock', () => {
  const state = freshState();
  assert.equal(snapshot(world, state).messages.length, 1, 'only the 6:02 AM nudge exists at 6:02 AM');
  setClock(state, '2026-10-20T19:12:00+01:00');
  assert.equal(snapshot(world, state).messages.length, 7);
});
