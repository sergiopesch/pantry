import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState, loadWorld } = await import('../src/data.js');
const { snapshot } = await import('../src/pantry.js');
const { hm, weekday } = await import('../src/util.js');

const world = loadWorld();
const s = snapshot(world, freshState());

test("eggs: 24 a week, Monday's dozen gone Thursday night", () => {
  const eggs = s.predictions.find(p => p.family === 'eggs');
  assert.equal(Math.round(eggs.perWeek), 24);
  assert.equal(eggs.confidence, 'high');
  const out = new Date(eggs.runsOutAt);
  assert.equal(weekday(out), 'Thursday');
  assert.ok(hm(out).h >= 19, 'runs out in the evening');
  assert.ok(out < new Date('2026-10-23T00:00:00+01:00'), 'gone before Friday');
  assert.equal(s.story.hook.nudge, "Eggs run out Thursday night. Two dozen are in Thursday's 4–6 PM delivery.");
});

test('slot: the latest one-off slot that still lands before the eggs run out', () => {
  assert.equal(s.slot.id, 'thu-16');
  assert.equal(s.slot.window, '4–6 PM');
  assert.equal(s.slot.oneOff, true);
  assert.ok(new Date(s.slot.end) < new Date(s.critical.runsOutAt));
});

test('cart: one cart, three lanes, every rule respected', () => {
  const lanes = Object.fromEntries(s.lanes.map(l => [l.id, l.lines.map(x => x.family)]));
  assert.ok(lanes.child.includes('milk'), "the child's needs win on staples");
  assert.ok(lanes.child.includes('bread'));
  assert.ok(lanes.adults.includes('coffee'));
  assert.ok(lanes.everyone.includes('eggs'));
  for (const line of s.cart.lines) {
    const p = world.catalog.get(line.sku);
    if (line.eaters.includes('sergio')) assert.ok(!p.tags.some(t => ['flour', 'dairy', 'ultra-processed'].includes(t)), `${line.sku} breaks the grown-ups' rules`);
    if (line.eaters.includes('daughter')) assert.ok(!p.tags.some(t => ['caffeine', 'spicy'].includes(t)), `${line.sku} is not for her`);
    assert.ok(!(p.kind === 'discretionary' && p.nova >= 4), `${line.sku} is a processed treat`);
  }
  assert.deepEqual(s.cart.leftOut.map(l => l.family).sort(), ['crisps', 'nuggets', 'pizza']);
  assert.ok(s.cart.lines.length >= 18 && s.cart.lines.length <= 24, `${s.cart.lines.length} lines`);
});

test("cart: two dozen eggs, swapped because the usual dozen is out Thursday", () => {
  const eggs = s.cart.lines.filter(l => l.family === 'eggs');
  assert.equal(eggs.reduce((n, l) => n + l.qty * l.pack.units, 0), 24);
  assert.equal(eggs[0].sku, 'eggs-medium-12');
  assert.equal(eggs[0].replaced.reason, 'unavailable');
  assert.match(s.story.replacement.opinion, /These are better: same twelve, 40p less/);
});

test('cart: staples with stock at home are skipped, not bought', () => {
  const skipped = s.cart.skipped.map(x => x.family);
  assert.ok(skipped.includes('olive-oil'));
  assert.ok(skipped.includes('cheddar'));
});

test('deals: clipped only where they match the predicted cart', () => {
  assert.deepEqual(s.deals.clipped.map(c => c.id).sort(), ['coupon-yoghurt', 'nectar-salmon']);
  const why = Object.fromEntries(s.deals.ignored.map(i => [i.id, i.why]));
  assert.match(why['nectar-pizza'], /grown-ups' call/);
  assert.match(why['nectar-crisps'], /grown-ups' call/);
  assert.match(why['nectar-olive-oil'], /Not running out/);
  assert.equal(s.totals.savings, 1.25);
});

test("deals: next week's Nectar six-pack covers half the run", () => {
  const offer = s.next.deals.offers.find(o => o.id === 'nectar-eggs-6');
  assert.equal(offer.coverage, 0.5);
  assert.equal(offer.from.sku, 'eggs-large-12');
  assert.equal(offer.to.qty, 4);
  assert.equal(offer.perRunSaving, 0.55);
  assert.equal(offer.saving, 1.1);
  assert.match(s.story.deals.ask, /^It covers half your run\. Two beat a dozen by 55p\. Want the switch\?$/);
});

test('identity: the basket drifted on Saturday 3 October', () => {
  assert.equal(s.identity.drifted, true);
  assert.equal(s.identity.startedAt.slice(0, 10), '2026-10-03');
  assert.equal(s.identity.text, 'Your basket drifted toward processed food on Saturday 3 October.');
  assert.match(s.identity.detail, /^Frozen pizza, multipack crisps and nuggets came in that day\./);
  assert.ok(s.identity.after - s.identity.before > 0.2);
});

test('inbox: quiet by default, drafts the case, learns from missing bananas', () => {
  assert.deepEqual(s.inbox.summary, { total: 6, silent: 4, needsYou: 1, drafted: 1 });
  assert.equal(s.inbox.learnings[0].to, 'bananas-loose');
  assert.match(s.inbox.learnings[0].text, /twice \(12 and 19 October\)/);
  assert.ok(s.cart.lines.some(l => l.sku === 'bananas-loose' && l.replaced?.reason === 'learned'));
});

test('narration never leaks undefined, NaN or null into words', () => {
  const strings = [];
  const walk = v => (typeof v === 'string' ? strings.push(v) : v && typeof v === 'object' && Object.values(v).forEach(walk));
  walk(s.story);
  for (const str of strings) assert.doesNotMatch(str, /undefined|NaN|\bnull\b|\[object/, str);
});
