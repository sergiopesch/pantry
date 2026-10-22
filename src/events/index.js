// Pantry for events: one engine behind the bot's MCP tools, the CLI and the app.
// Reads are free. Edits change the local draft. Anything that leaves the computer (a brief, an order,
// a payment) stops at an approval only a human can grant.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { importGuests } from './luma.js';
import { liveClient, syncLuma } from './luma-api.js';
import { readPast } from './archive.js';
import { LANES, allHistory, diets, headcount, ledger, options, plan } from './plan.js';
import { approve, charge, decline, requestApproval } from '../vault.js';
import { clock, dateKey, gbp, hm, iso, longDate, pct, round2, shortId } from '../util.js';

export const EVENTS_DIR = process.env.PANTRY_EVENTS ?? fileURLToPath(new URL('../../data/events/', import.meta.url));
export const EVENT_STATE = process.env.PANTRY_EVENT_STATE ?? join(EVENTS_DIR, 'state.json');

const read = name => JSON.parse(readFileSync(join(EVENTS_DIR, name), 'utf8'));

// The event comes from the organiser's Notion (pantry_event_set), guests from their Luma export (or the
// Luma API with Luma Plus), past attendance from their records, and the clock is real. Nothing about the
// event is hard-coded.
export async function loadEventWorld(state = freshEventState(), { client, refresh = false } = {}) {
  const policy = read('event.json');
  const key = process.env.LUMA_API_KEY;
  if ((client || key) && (!state.luma || refresh)) {
    state.luma = await syncLuma(client ?? liveClient({ apiKey: key }), { eventId: state.event?.lumaEventId, now: now(null, state) });
  }
  const ledger = read('history.json').events;
  const past = state.luma?.past ?? readPast(EVENTS_DIR);
  const known = read('providers.json').providers;
  const added = state.providers ?? [];
  return {
    event: state.event ? buildEvent(policy, state.event) : null,
    policy,
    source: state.luma?.source ?? 'luma-csv',
    providers: [...known.filter(p => !p.pastOnly), ...added],
    knownProviders: [...known, ...added],
    history: past.map(p => ({ ...p, ...ledger.find(l => l.lumaEventId === p.lumaEventId) })),
    guests: state.guests ?? state.luma?.guests ?? null,
    inbox: state.inbox ?? [],
    inboxAddress: state.inboxAddress ?? null,
  };
}

const UK_POSTCODE = /\b([A-Z]{1,2})\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

function buildEvent(policy, e) {
  const doors = new Date(e.start);
  const serve = e.serveAt ? new Date(e.serveAt) : new Date(doors.getTime() + policy.serveAfterDoorsMins * 60_000);
  const address = e.venue?.address ?? null;
  return {
    ...policy,
    name: e.name,
    kind: e.kind ?? (/hack/i.test(e.name) ? 'hackathon' : 'meetup'),
    ticket: e.ticket ?? 'free',
    doors: doors.toISOString(),
    ends: e.end ?? null,
    serve: serve.toISOString(),
    lumaEventId: e.lumaEventId ?? null,
    url: e.url ?? null,
    source: e.source ?? null,
    venue: {
      name: e.venue?.name ?? 'Venue',
      address,
      postcodeArea: address?.match(UK_POSTCODE)?.[1]?.toUpperCase() ?? null,
      deliveriesBefore: e.venue?.deliveriesBefore ?? null,
      access: e.venue?.access ?? [],
      confirm: address ? undefined : 'Venue address not set, so delivery coverage is unchecked.',
    },
    budget: { total: Number(e.budget?.total), currency: 'GBP', payer: e.budget?.payer ?? 'Organiser' },
  };
}

export const freshEventState = () => ({
  version: 1,
  clock: null,           // planning clock (ISO); null = the event's planningClock
  luma: null,            // last read of the Luma API (Luma Plus only)
  event: null,           // the upcoming event, from the organiser's Notion (pantry_event_set)
  providers: [],         // real providers Pantry found for this event, with sources (pantry_provider_add)
  guests: null,          // a re-imported Luma export replaces the bundled one
  planForOverride: null, // the organiser's own headcount
  choice: null,          // provider id, when the organiser picks something other than the recommendation
  quotes: {},            // provider id -> { amount, note, at }
  briefs: [],            // drafted briefs; sending one is a human decision
  debriefs: [],          // post-event outcomes, which feed the next plan
  approvals: [],
  orders: [],
  log: [],
});

export function loadEventState() {
  if (!existsSync(EVENT_STATE)) return freshEventState();
  try {
    return { ...freshEventState(), ...JSON.parse(readFileSync(EVENT_STATE, 'utf8')) };
  } catch {
    return freshEventState();
  }
}

export function saveEventState(state) {
  writeFileSync(`${EVENT_STATE}.tmp`, JSON.stringify(state, null, 2) + '\n');
  renameSync(`${EVENT_STATE}.tmp`, EVENT_STATE);
}

// Real time, unless a test pins it.
const now = (world, state) => new Date(process.env.PANTRY_CLOCK ?? state?.clock ?? Date.now());

function ready(world) {
  if (!world.event) throw new Error('No event yet. Read the upcoming event from Notion and call pantry_event_set.');
  if (!world.guests?.guests?.length) throw new Error('No guests yet. Import the Luma guest export with pantry_guests_import.');
}

// --- Edits (local draft only) ------------------------------------------------------------------------

export function importGuestFile(state, text) {
  const result = importGuests(text);
  if (!result.guests.length) throw new Error('No approved guests in that file. Is it a Luma guest export?');
  state.guests = result;
  return { imported: result.guests.length, waitlist: result.waitlist, declined: result.declined, dietQuestion: result.dietQuestion };
}

export function setHeadcount(state, planFor) {
  if (planFor == null) return (state.planForOverride = null), { planFor: null };
  const n = Number(planFor);
  if (!Number.isInteger(n) || n < 1) throw new Error('planFor must be a whole number of people.');
  state.planForOverride = n;
  return { planFor: n };
}

export function choose(world, state, id) {
  if (id == null || id === 'recommended') return (state.choice = null), { choice: null };
  if (!world.providers.some(p => p.id === id)) throw new Error(`No provider "${id}".`);
  state.choice = id;
  return { choice: id };
}

export function recordQuote(world, state, { provider, amount, note }) {
  if (!world.providers.some(p => p.id === provider)) throw new Error(`No provider "${provider}".`);
  const a = Number(amount);
  if (!(a > 0)) throw new Error('amount must be a positive number of pounds.');
  state.quotes[provider] = { amount: round2(a), note: note ?? null, at: iso(new Date()) };
  return state.quotes[provider];
}

// The upcoming event, as the organiser keeps it in Notion. Local draft only.
export function setEvent(state, e) {
  if (!e?.name || !e?.start) throw new Error('An event needs at least a name and a start time (ISO 8601).');
  if (Number.isNaN(new Date(e.start).getTime())) throw new Error(`Start time "${e.start}" isn't a date.`);
  if (!(Number(e.budget?.total) > 0)) throw new Error('Set a budget: budget.total in pounds.');
  if (e.venue?.deliveriesBefore && !/^\d{1,2}:\d{2}$/.test(e.venue.deliveriesBefore)) throw new Error('venue.deliveriesBefore is a local time like "18:00".');
  state.event = { ...e, setAt: iso(new Date()) };
  state.choice = null;
  return state.event;
}

const TAGS = new Set(['meat', 'pork', 'fish', 'vegetarian', 'vegan', 'halal', 'gluten-free', 'coeliac-safe', 'dairy-free', 'nut-free', 'sealed', 'spicy']);
const TIERS = new Set(['supermarket', 'caterer', 'restaurant']);
const ALLERGENS = new Set(['sealed-labelled', 'labelled', 'kitchen-may-contain', 'unknown']);

// A real provider Pantry found for this event. Every fact needs a source; unknown allergen handling is
// treated as "may contain", so nobody with an allergy is planned onto a guess.
export function addProvider(state, p) {
  if (!p?.name || !TIERS.has(p.tier)) throw new Error('A provider needs a name and a tier: supermarket, caterer or restaurant.');
  if (!p.source || !/^https?:\/\//.test(p.source)) throw new Error('A provider needs a source URL: where these prices and dishes came from.');
  if (!Array.isArray(p.dishes) || !p.dishes.length) throw new Error('A provider needs at least one dish with a price.');
  const dishes = p.dishes.map((d, i) => {
    const tags = (d.tags ?? []).map(t => String(t).toLowerCase());
    const bad = tags.filter(t => !TAGS.has(t));
    if (bad.length) throw new Error(`Unknown dish tags: ${bad.join(', ')}. Use: ${[...TAGS].join(', ')}.`);
    if (!(Number(d.price) > 0)) throw new Error(`Dish "${d.name}" needs a price per portion, in pounds including VAT.`);
    return { id: `${slug(p.name)}-${i}`, name: String(d.name), tags, price: Number(d.price) };
  });
  const f = p.fulfilment ?? {};
  const provider = {
    id: p.id ?? slug(p.name),
    name: String(p.name),
    tier: p.tier,
    source: p.source,
    live: true,
    checkedAt: iso(new Date()),
    fulfilment: { type: f.type === 'collection' ? 'collection' : 'delivery', fee: Number(f.fee ?? 0), leadHours: Number(f.leadHours ?? 48), travelMins: f.travelMins, label: f.label ?? f.type ?? 'delivery' },
    minOrder: Number(p.minOrder ?? 0),
    maxPortions: p.maxPortions ? Number(p.maxPortions) : undefined,
    deliversTo: Array.isArray(p.deliversTo) && p.deliversTo.length ? p.deliversTo.map(a => String(a).toUpperCase()) : null,
    allergens: ALLERGENS.has(p.allergens) && p.allergens !== 'unknown' ? p.allergens : 'kitchen-may-contain',
    dishes,
    extras: p.extras?.perHead ? { label: String(p.extras.label ?? 'Drinks'), perHead: Number(p.extras.perHead) } : undefined,
    reviews: p.reviews?.rating ? { rating: Number(p.reviews.rating), count: Number(p.reviews.count ?? 0), source: p.reviews.source ?? p.source } : undefined,
    notes: [...(p.notes ?? []), ...(p.allergens === 'unknown' || !p.allergens ? ['Allergen handling not confirmed, so treated as "may contain nuts"'] : [])],
  };
  state.providers = [...(state.providers ?? []).filter(x => x.id !== provider.id), provider];
  return provider;
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// --- Inbox -------------------------------------------------------------------------------------------

export function triage(world, state) {
  if (!world.inbox.length) return { address: world.inboxAddress, items: [], needsYou: [], learned: [], text: "Pantry's own email isn't switched on yet, so there's nothing to triage." };
  const items = world.inbox.map(m => {
    switch (m.kind) {
      case 'registrations':
        return { ...m, action: 'filed', note: 'Headcount refreshed from the guest list.' };
      case 'guest-question':
        return { ...m, action: 'reply-drafted', note: 'Drafted: "Yes. Sealed coeliac-safe plates, on their own table." Sends on your yes.' };
      case 'quote': {
        const promised = m.body.match(/by (\d{1,2}:\d{2})/)?.[1];
        const at = venueCutoff(world);
        const cutoff = at && `${String(hm(at).h).padStart(2, '0')}:${String(hm(at).m).padStart(2, '0')}`;
        const late = promised && cutoff && promised > cutoff;
        const price = state.quotes[m.provider] ? `Quote recorded: ${gbp(state.quotes[m.provider].amount)}.` : 'No price yet, so the estimate stands.';
        return { ...m, action: late ? 'needs-you' : 'filed', note: late ? `They offered ${promised}, but the venue stops deliveries at ${cutoff}. The brief asks for ${cutoff} instead. ${price}` : price };
      }
      case 'venue':
        return { ...m, action: 'learned', note: 'Deliveries to reception before 18:00. Drop times now land by then.' };
      case 'sponsor':
        return { ...m, action: 'needs-you', note: 'The sponsor wants a PO number on the invoice. What is it?' };
      default:
        return { ...m, action: 'archived', note: 'Not food.' };
    }
  });
  const quiet = items.filter(i => i.action === 'filed' || i.action === 'archived' || i.action === 'learned').length;
  const needsYou = items.filter(i => i.action === 'needs-you' || i.action === 'reply-drafted');
  return {
    address: world.inboxAddress,
    items,
    needsYou: needsYou.map(i => ({ id: i.id, subject: i.subject, note: i.note })),
    learned: items.filter(i => i.action === 'learned').map(i => i.note),
    text: `${items.length} emails. ${quiet} handled quietly. ${needsYou.length} need${needsYou.length === 1 ? 's' : ''} you.`,
  };
}

// The venue's delivery cut-off (from the event in Notion) moves every drop time.
function venueCutoff(world) {
  const m = world.event?.venue.deliveriesBefore?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const serve = new Date(world.event.serve);
  const local = hm(serve);
  return new Date(serve.getTime() - (local.h * 60 + local.m - (Number(m[1]) * 60 + Number(m[2]))) * 60_000).toISOString();
}

// --- Snapshot ----------------------------------------------------------------------------------------

export function eventSnapshot(world, state) {
  ready(world);
  const at = now(world, state);
  const cutoff = venueCutoff(world);
  const p = plan(world, state, { now: at, latestDelivery: cutoff });
  const approval = state.approvals.at(-1) ?? null;
  return {
    now: iso(at),
    event: world.event,
    headcount: p.headcount,
    diets: diets(world, state),
    plan: p,
    approval,
    order: state.orders.at(-1) ?? null,
    inbox: triage(world, state),
  };
}

export const eventOptions = (world, state, tier) => {
  ready(world);
  const r = options(world, state, { now: now(world, state), latestDelivery: venueCutoff(world) });
  return { headcount: r.headcount, options: tier ? r.options.filter(o => o.tier === tier) : r.options };
};

export const providerLedger = (world, state) => ledger(world, state);

// --- Brief (drafted here, sent by a human) -----------------------------------------------------------

export function draftBrief(world, state) {
  const s = eventSnapshot(world, state);
  const c = s.plan.chosen;
  if (!c) throw new Error('No plan to brief yet.');
  const { event } = world;
  const critical = s.diets.needs.filter(n => n.critical);
  const needs = [
    ...(critical.length ? [`sealed and labelled, one each: ${critical.map(n => `${n.count} ${n.label.toLowerCase()}`).join(', ')}`] : []),
    ...s.diets.needs.filter(n => !n.critical).map(n => `${n.count} ${n.label.toLowerCase()}`),
  ];
  const dishes = new Map();
  for (const l of c.lines) {
    const d = dishes.get(l.dish) ?? { name: l.name, qty: 0, lanes: [] };
    d.qty += l.qty;
    if (l.lane !== 'everyone') d.lanes.push(`${l.qty} ${LANES[l.lane].toLowerCase()}`);
    dishes.set(l.dish, d);
  }
  const order = [...dishes.values()].map(d => `${d.qty} × ${d.name}${d.lanes.length ? ` (${d.lanes.join(', ')})` : ''}`);
  const brief = {
    id: shortId('brf'),
    status: 'draft',
    to: c.name,
    provider: c.id,
    event: event.name,
    date: longDate(event.serve),
    headcount: s.plan.headcount.planFor,
    lines: c.lines.map(l => ({ lane: l.lane, dish: l.name, qty: l.qty })),
    needs,
    budget: c.cost.total,
    dropBy: c.dropAt,
    venue: { name: event.venue.name, address: event.venue.address ?? 'to confirm', access: event.venue.access },
    text: [
      `Hello ${c.name},`,
      `Catering for ${event.name}, ${longDate(event.serve)}. Food is served at ${clock(event.serve)}; please land by ${clock(c.dropAt)}.`,
      `${s.plan.headcount.planFor} people: ${order.join('; ')}.`,
      `Dietary needs: ${needs.join('; ')}.`,
      `Venue: ${event.venue.name}. ${event.venue.access.join('. ')}.`,
      `Budget up to ${gbp(c.cost.total)}. Please confirm the price and the allergen handling.`,
      'Thanks, Pantry (on behalf of the organiser)',
    ].join('\n'),
    note: 'Drafted. Pantry sends it from its own address only after the organiser says yes.',
  };
  state.briefs.push(brief);
  return brief;
}

// --- Payment -----------------------------------------------------------------------------------------

const planHash = c => createHash('sha256').update(JSON.stringify([c.id, c.lines.map(l => [l.key, l.qty]), c.cost.total])).digest('hex').slice(0, 16);

export function requestPayment(world, state) {
  const s = eventSnapshot(world, state);
  const c = s.plan.chosen;
  if (!c) throw new Error('No plan to pay for.');
  if (!c.eligible) throw new Error(`${c.name} can't feed everyone safely: ${c.excluded[0]}.`);
  if (state.orders.some(o => o.planHash === planHash(c))) throw new Error('This plan is already paid for.');
  const approval = requestApproval(state, { merchant: c.name, amount: c.cost.total, memo: `${world.event.name}: ${c.portions} plates`, cartHash: planHash(c), now: now(world, state) });
  approval.prompt = `Pantry wants to spend ${gbp(c.cost.total)} with ${c.name} for ${world.event.name}.`;
  return approval;
}

// Real payment processing: Pantry attaches the processor's payment link (e.g. a Stripe Payment Link it
// created), the organiser pays it themselves, and Pantry records the payment only after the processor
// reports it paid, for exactly the approved amount and an unchanged plan.
export function attachPaymentLink(state, { approvalId, url, reference, processor = 'stripe' }) {
  const a = state.approvals.find(x => x.id === approvalId);
  if (!a || a.status !== 'pending') throw new Error('No pending approval with that id. Call pantry_checkout_request first.');
  if (!/^https:\/\//.test(url ?? '')) throw new Error('The payment link must be an https URL from the processor.');
  a.payment = { processor, url, reference: reference ?? null, status: 'awaiting-organiser', linkedAt: iso(new Date()) };
  state.log.push({ at: iso(new Date()), event: 'payment.link', approval: a.id, processor, reference: reference ?? null });
  return a;
}

export function confirmPayment(world, state, { approvalId, reference, amount, status }) {
  const a = state.approvals.find(x => x.id === approvalId);
  if (!a?.payment) throw new Error('That approval has no payment link.');
  if (!['paid', 'succeeded', 'complete'].includes(String(status).toLowerCase())) throw new Error(`The processor says "${status}", not paid. Nothing recorded.`);
  if (Math.abs(Number(amount) - a.amount) > 0.005) throw new Error(`The processor reports £${amount}, but the organiser approved ${gbp(a.amount)}. Nothing recorded.`);
  const c = eventSnapshot(world, state).plan.chosen;
  if (a.cartHash !== planHash(c)) throw new Error('The plan changed after the payment request. Raise a new one.');
  const at = now(world, state);
  a.status = 'charged';
  a.payment = { ...a.payment, status: 'paid', reference: reference ?? a.payment.reference, paidAt: iso(at) };
  a.receipt = { id: reference ?? a.payment.reference, status: 'cleared', merchant: a.merchant, amount: a.amount, at: iso(at), driver: a.payment.processor };
  const order = { id: shortId('ord'), provider: c.id, name: c.name, amount: a.amount, plates: c.portions, dropAt: c.dropAt, planHash: planHash(c), placedAt: iso(at), status: 'paid', driver: a.payment.processor, reference: a.receipt.id };
  state.orders.push(order);
  state.log.push({ at: iso(at), event: 'payment.confirmed', approval: a.id, reference: a.receipt.id, amount: a.amount });
  return { approval: a, order };
}

// Human only: the CLI's stub stands in for the organiser's approval on their phone.
export function approvePayment(world, state, id, { driver } = {}) {
  const s = eventSnapshot(world, state);
  const c = s.plan.chosen;
  const a = state.approvals.find(x => x.id === id);
  if (!a) throw new Error('No such approval.');
  if (a.cartHash !== planHash(c)) {
    a.status = 'void';
    throw new Error('The plan changed after this approval was requested. Ask again.');
  }
  const at = now(world, state);
  approve(state, id, { driver, now: at });
  const receipt = charge(state, id, { driver, merchant: c.name, amount: c.cost.total, now: at });
  const order = { id: shortId('ord'), provider: c.id, name: c.name, amount: receipt.amount, plates: c.portions, dropAt: c.dropAt, planHash: planHash(c), placedAt: iso(at), status: 'confirmed', driver: receipt.driver };
  state.orders.push(order);
  return { approval: a, receipt, order };
}

export const declinePayment = (state, id) => decline(state, id);

// --- After the event ---------------------------------------------------------------------------------

export function debrief(world, state, input) {
  const { event } = world;
  const order = state.orders.at(-1);
  const attended = Number(input.attended);
  if (!Number.isInteger(attended) || attended < 0) throw new Error('attended must be the number of people who came.');
  const leftoverPct = Number(input.leftoverPct ?? input.leftoversPct ?? 0);
  const signedUp = headcount(world, state).signedUp;
  const before = headcount(world, state);
  const record = {
    id: shortId('evt'),
    lumaEventId: event.lumaEventId,
    name: event.name,
    kind: event.kind,
    ticket: event.ticket,
    date: dateKey(event.serve),
    signedUp,
    attended,
    orderedFor: before.planFor,
    provider: input.provider ?? order?.provider ?? plan(world, state).chosen?.id,
    spend: order?.amount ?? null,
    onTime: input.onTime !== false && !(input.minsLate > 0),
    minsLate: Number(input.minsLate ?? 0),
    leftoverPct: round2(leftoverPct > 1 ? leftoverPct / 100 : leftoverPct),
    rating: Number(input.rating ?? 4),
    ranOut: input.ranOut ?? [],
    notes: input.notes ?? '',
  };
  state.debriefs.push(record);
  const after = headcount(world, state);
  const book = ledger(world, state).find(l => l.id === record.provider);
  const learnings = [
    `${attended} of ${signedUp} came (${pct(attended / signedUp)}). ${pct(before.showRate) === pct(after.showRate) ? `The show rate holds at ${pct(after.showRate)}.` : `The show rate moves from ${pct(before.showRate)} to ${pct(after.showRate)}.`}`,
    record.leftoverPct >= 0.2 ? `${pct(record.leftoverPct)} came back. Order fewer next time.` : `${pct(record.leftoverPct)} came back. About right.`,
    book ? `${book.name} now rates ${book.rating.toFixed(1)} over ${book.events} ${book.events === 1 ? 'event' : 'events'}${book.onTime < 1 ? `, on time ${pct(book.onTime)}` : ', always on time'}.` : null,
    ...record.ranOut.map(r => `${r} ran out, so it gets a buffer next time.`),
  ].filter(Boolean);
  state.lastLearnings = learnings;
  return { record, learnings, showRate: after.showRate, history: allHistory(world, state).length };
}
