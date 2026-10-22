import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDiet, importGuests } from '../src/events/luma.js';
import { guestFromLuma, liveClient, syncLuma, venueFromLuma } from '../src/events/luma-api.js';
import {
  approvePayment, choose, debrief, draftBrief, eventOptions, eventSnapshot, freshEventState, loadEventWorld, recordQuote, requestPayment, setHeadcount,
} from '../src/events/index.js';

const world = await loadEventWorld(freshEventState());
const fresh = () => freshEventState();

test('reads diets the way people type them', () => {
  assert.deepEqual(readDiet('Vegan, no nuts please').needs, ['nut-allergy', 'vegan']);
  assert.deepEqual(readDiet('coeliac - strict gluten free').needs, ['coeliac', 'gluten-free']);
  assert.deepEqual(readDiet('lactose intolerant').needs, ['dairy-free']);
  assert.deepEqual(readDiet('veggie').needs, ['vegetarian']);
  assert.deepEqual(readDiet('N/A').needs, []);
  assert.deepEqual(readDiet('not too spicy').prefs, ['mild']);
});

test('imports only approved guests from a Luma export, quoted cells included', () => {
  const csv = 'api_id,name,approval_status,checked_in_at,What should we know about your diet?\n' +
    'g1,Ada,approved,,"Vegan, no nuts please"\ng2,Ben,waitlist,,\ng3,Chloe,approved,,none\n';
  const r = importGuests(csv);
  assert.equal(r.guests.length, 2);
  assert.equal(r.waitlist, 1);
  assert.deepEqual(r.guests[0].needs, ['nut-allergy', 'vegan']);
});

test('plans for who shows up, not who signed up, with allergies at 100%', () => {
  const s = eventSnapshot(world, fresh());
  assert.equal(s.headcount.signedUp, 140);
  assert.equal(s.headcount.showRate, 0.6);
  assert.equal(s.headcount.planFor, 93);
  assert.equal(s.headcount.criticalAt100, 6);
  const safe = s.plan.chosen.lines.filter(l => l.lane === 'allergy-safe').reduce((n, l) => n + l.qty, 0);
  assert.equal(safe, 6, 'every allergy or coeliac guest gets a sealed plate, whatever the forecast');
});

test('excludes any provider that leaves a declared need without a safe plate', () => {
  const { options } = eventOptions(world, fresh());
  const by = id => options.find(o => o.id === id);
  assert.match(by('slice-theory').excluded[0], /Coeliac: 2 guests would go without/);
  assert.match(by('hearth-and-co').excluded.join(' '), /Nut allergy/);
  assert.match(by('hearth-and-co').excluded.join(' '), /over the £1000\.00 budget/);
  assert.ok(options.filter(o => o.eligible).every(o => o.coverage.safeForEveryone && o.fitsBudget));
});

test('recommends quality inside the budget, and says what the cheaper option costs you', () => {
  const p = eventSnapshot(world, fresh()).plan;
  assert.equal(p.chosen.id, 'little-feast');
  assert.ok(p.budget.left >= 0);
  assert.match(p.text, /Sainsbury's would save £\d+\.\d\d, but gluten-free ran out last time\./);
  assert.ok(p.chosen.buffers.some(b => /Gluten-free ran out/.test(b.why)));
});

test("learns the venue's delivery cut-off from the inbox", () => {
  const s = eventSnapshot(world, fresh());
  assert.equal(s.plan.chosen.dropAt, '2026-10-22T17:00:00.000Z');
  assert.match(s.plan.logistics[0], /venue takes deliveries until then/);
  assert.ok(s.inbox.needsYou.some(i => /venue stops deliveries at 18:00/.test(i.note)));
});

test('a quote replaces the estimate, and an override changes the headcount', () => {
  const state = fresh();
  recordQuote(world, state, { provider: 'little-feast', amount: 940 });
  setHeadcount(state, 80);
  const p = eventSnapshot(world, state).plan;
  assert.equal(p.chosen.cost.total, 940);
  assert.equal(p.headcount.planFor, 80);
});

test('the brief is a draft; payment needs the organiser, and a changed plan voids it', () => {
  const state = fresh();
  assert.equal(draftBrief(world, state).status, 'draft');
  const a = requestPayment(world, state);
  assert.equal(a.status, 'pending');
  choose(world, state, 'sainsburys');
  assert.throws(() => approvePayment(world, state, a.id), /plan changed/);
  const b = requestPayment(world, state);
  const r = approvePayment(world, state, b.id);
  assert.equal(r.approval.status, 'charged');
  assert.equal(r.approval.card.state, 'dead');
  assert.throws(() => requestPayment(world, state), /already paid/);
});

test('a debrief moves the show rate and the provider ledger', () => {
  const state = fresh();
  const r = debrief(world, state, { attended: 88, leftoverPct: 8, rating: 4.7, provider: 'little-feast' });
  assert.equal(r.showRate, 0.6);
  assert.match(r.learnings.join(' '), /Little Feast now rates 4\.7 over 2 events/);
});

test('reads tonight and ten past events from Luma CSV exports, joined to the ledger', () => {
  assert.equal(world.source, 'luma-csv');
  assert.equal(world.event.name, 'Grok Bot Community Hackathon');
  assert.equal(world.guests.guests.length, 140);
  assert.equal(world.guests.waitlist, 12);
  assert.equal(world.history.length, 10);
  assert.deepEqual(world.history.at(-1).signedUp, 150);
  assert.deepEqual(world.history.at(-1).attended, 93);
  assert.equal(world.history.at(-1).provider, 'little-feast', "Pantry's ledger joins Luma's attendance by event id");
});

test('maps Luma guest and venue shapes', () => {
  const g = guestFromLuma({
    id: 'gst-1', user_name: 'Ada', approval_status: 'approved',
    registration_answers: [{ label: 'Company', question_type: 'company', value: { company: 'X' } }, { label: 'Dietary needs?', question_type: 'select', multiple: true, value: ['Vegan', 'Nut allergy'] }],
    event_tickets: [{ checked_in_at: '2026-10-22T18:05:00.000Z' }],
  });
  assert.deepEqual(g.needs, ['nut-allergy', 'vegan']);
  assert.equal(g.checkedIn, true);
  const v = venueFromLuma({ name: 'x', geo_address_json: { address: 'Hall', full_address: '1 Example St, London EC2A 4NE, UK' } });
  assert.equal(v.postcodeArea, 'EC');
});

test('the live client sends the key, pages through results, and syncs', async () => {
  const calls = [];
  const pages = {
    '/v1/calendars/events/list': [{ entries: [{ id: 'evt-a', name: 'Hack', location_type: 'offline', start_at: '2026-10-22T17:00:00Z', end_at: '2026-10-22T22:00:00Z' }], has_more: false }],
    '/v1/events/get': [{ id: 'evt-a', name: 'Hack', start_at: '2026-10-22T17:00:00Z', end_at: '2026-10-22T22:00:00Z', registration_questions: [{ label: 'Allergies?' }] }],
    '/v1/events/guests/list': [
      { entries: [{ id: 'g1', approval_status: 'approved', registration_answers: [{ label: 'Allergies?', value: 'coeliac' }] }], has_more: true, next_cursor: 'c2' },
      { entries: [{ id: 'g2', approval_status: 'waitlist' }], has_more: false },
    ],
  };
  const fetchImpl = async (url, opts) => {
    calls.push({ path: url.pathname, cursor: url.searchParams.get('pagination_cursor'), key: opts.headers['x-luma-api-key'] });
    return { ok: true, json: async () => pages[url.pathname].shift() };
  };
  const r = await syncLuma(liveClient({ apiKey: 'k', fetchImpl }), { now: '2026-10-19T09:00:00Z' });
  assert.ok(calls.every(c => c.key === 'k'));
  assert.deepEqual(calls.filter(c => c.path === '/v1/events/guests/list').map(c => c.cursor), [null, 'c2']);
  assert.equal(r.source, 'luma-api');
  assert.equal(r.guests.guests.length, 1);
  assert.equal(r.guests.waitlist, 1);
  assert.equal(r.event.dietQuestion, 'Allergies?');
});
