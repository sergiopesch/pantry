import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readDiet, importGuests } from '../src/events/luma.js';
import { guestFromLuma, liveClient, syncLuma, venueFromLuma } from '../src/events/luma-api.js';
import {
  addProvider, approvePayment, attachPaymentLink, choose, confirmPayment, debrief, draftBrief, eventOptions, eventSnapshot,
  freshEventState, importGuestFile, loadEventWorld, recordQuote, requestPayment, setEvent, setHeadcount,
} from '../src/events/index.js';

const GUESTS = readFileSync(fileURLToPath(new URL('../data/events/guests.csv', import.meta.url)), 'utf8');
const EVENT = {
  name: 'Grok Builders Hack Night', kind: 'hackathon', ticket: 'free',
  start: '2026-10-29T18:00:00+00:00', serveAt: '2026-10-29T19:30:00+00:00', source: 'https://www.notion.so/example',
  venue: { name: 'Test Venue', address: '1 Example Street, London EC2A 4NE', deliveriesBefore: '18:00', access: ['Reception, then the goods lift'] },
  budget: { total: 1000, payer: 'Sponsor' },
};
const KITCHEN = {
  name: 'Test Kitchen', tier: 'caterer', source: 'https://example.com/menu', allergens: 'sealed-labelled', deliversTo: ['EC', 'WC'],
  fulfilment: { type: 'delivery', fee: 25, leadHours: 48 }, minOrder: 200, reviews: { rating: 4.6, count: 230, source: 'https://example.com/reviews' }, extras: { label: 'Soft drinks', perHead: 0.6 },
  dishes: [
    { name: 'Chicken bowl', price: 9.9, tags: ['meat', 'halal', 'gluten-free', 'nut-free'] },
    { name: 'Cauliflower bowl, sealed', price: 9.5, tags: ['vegan', 'gluten-free', 'coeliac-safe', 'nut-free', 'sealed'] },
  ],
};

async function ready({ kitchen = true } = {}) {
  const state = { ...freshEventState(), clock: '2026-10-26T10:00:00+00:00' };
  setEvent(state, EVENT);
  importGuestFile(state, GUESTS);
  if (kitchen) addProvider(state, KITCHEN);
  return { state, world: await loadEventWorld(state) };
}

test('reads diets the way people type them', () => {
  assert.deepEqual(readDiet('Vegan, no nuts please').needs, ['nut-allergy', 'vegan']);
  assert.deepEqual(readDiet('coeliac - strict gluten free').needs, ['coeliac', 'gluten-free']);
  assert.deepEqual(readDiet('lactose intolerant').needs, ['dairy-free']);
  assert.deepEqual(readDiet('N/A').needs, []);
});

test('imports only approved guests from a Luma export, quoted cells included', () => {
  const r = importGuests('api_id,name,approval_status,checked_in_at,What should we know about your diet?\ng1,Ada,approved,,"Vegan, no nuts please"\ng2,Ben,waitlist,,\ng3,Chloe,approved,,none\n');
  assert.equal(r.guests.length, 2);
  assert.equal(r.waitlist, 1);
});

test('nothing is hard-coded: without an event from Notion and a guest list, Pantry asks for them', async () => {
  const state = freshEventState();
  const world = await loadEventWorld(state);
  assert.equal(world.event, null);
  assert.throws(() => eventSnapshot(world, state), /Read the upcoming event from Notion/);
  setEvent(state, EVENT);
  const withEvent = await loadEventWorld(state);
  assert.throws(() => eventSnapshot(withEvent, state), /Import the Luma guest export/);
});

test('the event comes from Notion: venue postcode area, cut-off, budget', async () => {
  const { world } = await ready();
  assert.equal(world.event.name, 'Grok Builders Hack Night');
  assert.equal(world.event.venue.postcodeArea, 'EC');
  assert.equal(world.event.budget.total, 1000);
  assert.throws(() => setEvent(freshEventState(), { name: 'x', start: 'soon', budget: { total: 1 } }), /isn't a date/);
});

test('plans for who shows up from ten past events, allergies at 100%', async () => {
  const { world, state } = await ready();
  const s = eventSnapshot(world, state);
  assert.equal(world.history.length, 10);
  assert.equal(s.headcount.signedUp, 140);
  assert.equal(s.headcount.showRate, 0.6);
  assert.equal(s.headcount.planFor, 93);
  const safe = s.plan.chosen.lines.filter(l => l.lane === 'allergy-safe').reduce((n, l) => n + l.qty, 0);
  assert.equal(safe, 6);
});

test('fictional past providers are memory only; real ones need a source and a safe plate for everyone', async () => {
  const { world, state } = await ready();
  const { options } = eventOptions(world, state);
  assert.ok(!options.some(o => o.id === 'little-feast'), 'past-only providers are not offered');
  assert.equal(options.find(o => o.id === 'test-kitchen').eligible, true);
  assert.match(options.find(o => o.id === 'mands').excluded[0], /Nut allergy \+ Vegan/);
  assert.throws(() => addProvider(freshEventState(), { ...KITCHEN, source: 'my head' }), /source URL/);
  assert.throws(() => addProvider(freshEventState(), { ...KITCHEN, dishes: [{ name: 'x', price: 3, tags: ['tasty'] }] }), /Unknown dish tags/);
  const unknown = addProvider(freshEventState(), { ...KITCHEN, allergens: 'unknown' });
  assert.equal(unknown.allergens, 'kitchen-may-contain');
});

test("recommends quality inside the budget, and applies the venue's delivery cut-off", async () => {
  const { world, state } = await ready();
  const p = eventSnapshot(world, state).plan;
  assert.equal(p.chosen.id, 'test-kitchen');
  assert.ok(p.budget.left >= 0);
  assert.match(p.text, /Sainsbury's would save £\d+\.\d\d, but gluten-free ran out last time\./);
  assert.equal(p.chosen.dropAt, '2026-10-29T18:00:00.000Z');
  assert.match(p.logistics[0], /venue takes deliveries until then/);
});

test('a quote replaces the estimate, and an override changes the headcount', async () => {
  const { world, state } = await ready();
  recordQuote(world, state, { provider: 'test-kitchen', amount: 940 });
  setHeadcount(state, 80);
  const p = eventSnapshot(world, state).plan;
  assert.equal(p.chosen.cost.total, 940);
  assert.equal(p.headcount.planFor, 80);
});

test('payment: the organiser pays a processor link; Pantry records it only when the processor says paid', async () => {
  const { world, state } = await ready();
  assert.equal(draftBrief(world, state).status, 'draft');
  const a = requestPayment(world, state);
  assert.throws(() => attachPaymentLink(state, { approvalId: a.id, url: 'http://insecure' }), /https/);
  attachPaymentLink(state, { approvalId: a.id, url: 'https://buy.stripe.com/test_123', reference: 'plink_1' });
  assert.throws(() => confirmPayment(world, state, { approvalId: a.id, amount: a.amount, status: 'open' }), /not paid/);
  assert.throws(() => confirmPayment(world, state, { approvalId: a.id, amount: a.amount + 1, status: 'paid' }), /approved/);
  const r = confirmPayment(world, state, { approvalId: a.id, amount: a.amount, status: 'paid', reference: 'cs_test_1' });
  assert.equal(r.approval.status, 'charged');
  assert.equal(r.order.driver, 'stripe');
  assert.throws(() => requestPayment(world, state), /already paid/);
});

test('a changed plan voids the approval', async () => {
  const { world, state } = await ready();
  const a = requestPayment(world, state);
  choose(world, state, 'sainsburys');
  assert.throws(() => approvePayment(world, state, a.id), /plan changed/);
});

test('a debrief moves the show rate and the provider ledger', async () => {
  const { world, state } = await ready();
  const r = debrief(world, state, { attended: 88, leftoverPct: 8, rating: 4.7, provider: 'test-kitchen' });
  assert.equal(r.showRate, 0.6);
  assert.match(r.learnings.join(' '), /Test Kitchen now rates 4\.7 over 1 event/);
});

test('maps Luma guest and venue shapes', () => {
  const g = guestFromLuma({ id: 'g', approval_status: 'approved', registration_answers: [{ label: 'Dietary needs?', value: ['Vegan', 'Nut allergy'] }], event_tickets: [{ checked_in_at: '2026-10-22T18:05:00Z' }] });
  assert.deepEqual(g.needs, ['nut-allergy', 'vegan']);
  assert.equal(venueFromLuma({ name: 'x', geo_address_json: { address: 'Hall', full_address: '1 Example St, London EC2A 4NE' } }).postcodeArea, 'EC');
});

test('the live Luma client sends the key and pages through results', async () => {
  const calls = [];
  const pages = {
    '/v1/calendars/events/list': [{ entries: [{ id: 'evt-a', name: 'Hack', location_type: 'offline', start_at: '2026-10-29T17:00:00Z', end_at: '2026-10-29T22:00:00Z' }], has_more: false }],
    '/v1/events/get': [{ id: 'evt-a', name: 'Hack', start_at: '2026-10-29T17:00:00Z', end_at: '2026-10-29T22:00:00Z', registration_questions: [{ label: 'Allergies?' }] }],
    '/v1/events/guests/list': [{ entries: [{ id: 'g1', approval_status: 'approved', registration_answers: [{ label: 'Allergies?', value: 'coeliac' }] }], has_more: true, next_cursor: 'c2' }, { entries: [{ id: 'g2', approval_status: 'waitlist' }], has_more: false }],
  };
  const fetchImpl = async (url, opts) => (calls.push({ path: url.pathname, cursor: url.searchParams.get('pagination_cursor'), key: opts.headers['x-luma-api-key'] }), { ok: true, json: async () => pages[url.pathname].shift() });
  const r = await syncLuma(liveClient({ apiKey: 'k', fetchImpl }), { now: '2026-10-26T09:00:00Z' });
  assert.ok(calls.every(c => c.key === 'k'));
  assert.deepEqual(calls.filter(c => c.path === '/v1/events/guests/list').map(c => c.cursor), [null, 'c2']);
  assert.equal(r.guests.guests.length, 1);
});
