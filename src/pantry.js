// The loop: predict -> build -> cards -> deals -> pay -> deliver -> inbox.
// Pure planning functions over (world, state), plus the few actions that change state. Every external
// write (order, payment, case filing) goes through an explicit human approval.
import { createHash } from 'node:crypto';
import { buildCart, byLane, totals } from './cart.js';
import { matchDeals } from './deals.js';
import { describeSlot, pickSlot, slotWeekAfter } from './delivery.js';
import { decide } from './household.js';
import { detectDrift } from './identity.js';
import { learnedBefore, triage } from './inbox.js';
import { predictFamilies, serialisePrediction } from './predict.js';
import { story } from './narrate.js';
import { approve, charge, decline, driverFromEnv, requestApproval, VaultError } from './vault.js';
import { addHours, clock, gbp, iso, round2, shortId } from './util.js';

export const MERCHANT = "Sainsbury's";

// The household clock: an override for tests, then the clock the household has moved to, then the scenario start.
export const householdNow = (world, state) => new Date(process.env.PANTRY_NOW ?? state?.clock ?? world.household.demoClock);

function preferencesFor(world, state, now) {
  const inbox = triage({ emails: [...world.inbox, ...state.inboxExtra], catalog: world.catalog, household: world.household, caseStatus: caseStatus(state) });
  const learned = Object.fromEntries(learnedBefore(inbox.learnings, now).map(l => [l.family, l]));
  return { inbox, preferences: { ...learned, ...state.preferences } };
}

const caseStatus = state => Object.fromEntries(state.cases.map(c => [c.id, c.status]));

export function cartHash(cart, slot) {
  const key = cart.lines.filter(l => l.status === 'in').map(l => `${l.sku}x${l.qty}`).sort().join('|') + `@${slot?.id}`;
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

export function plan(world, state, { now = householdNow(world, state) } = {}) {
  const { household, catalog, availability } = world;
  const { inbox, preferences } = preferencesFor(world, state, now);
  // Pantry's own orders count as history once they've landed.
  const predictions = predictFamilies({ orders: [...world.history, ...state.orders], catalog, now });
  const critical = predictions.find(p => decide(catalog.get(p.usualSku), household).include) ?? null;
  const booked = state.orders.find(o => o.slotId && new Date(o.slotEnd) > now);
  const slot = booked
    ? describeSlot(world.slots.find(s => s.id === booked.slotId), { runOut: critical?.runsOutAt, family: critical?.family })
    : pickSlot({ slots: world.slots, household, now, runOut: critical?.runsOutAt, family: critical?.family });
  const cart = buildCart({ household, catalog, availability, predictions, deliveryAt: slot.start, preferences, edits: state.cartEdits });
  const deals = matchDeals({ cart, deals: world.deals, catalog, household, predictions, at: slot.start });
  const identity = detectDrift({ orders: world.history, catalog });
  return {
    now: iso(now),
    predictions,
    critical,
    slot,
    cart,
    deals,
    totals: totals(cart, slot.fee),
    lanes: byLane(cart, household),
    identity,
    inbox,
    preferences,
    hash: cartHash(cart, slot),
  };
}

// Next week's draft: assumes this week's order lands, keeps the same window, re-runs the whole engine.
export function planNext(world, state, current) {
  const { household, catalog, availability } = world;
  const slot = slotWeekAfter(world.slots, current.slot);
  if (!slot) return null;
  const placed = state.orders.length
    ? state.orders
    : [{ id: 'planned', type: 'pantry', deliveredAt: current.slot.end, lines: current.cart.lines.filter(l => l.status === 'in').map(l => ({ sku: l.sku, qty: l.qty })) }];
  const now = new Date(current.slot.end);
  const { preferences } = preferencesFor(world, state, now);
  const predictions = predictFamilies({ orders: [...world.history, ...placed], catalog, now });
  const cart = buildCart({ household, catalog, availability, predictions, deliveryAt: slot.start, preferences });
  const deals = matchDeals({ cart, deals: world.deals, catalog, household, predictions, at: slot.start });
  return { slot, cart, deals, totals: totals(cart, slot.fee), predictions };
}

// Booked → being picked → on its way → delivered, read off the household clock.
export function orderProgress(order, now) {
  const start = new Date(order.slotStart);
  const end = new Date(order.slotEnd);
  const steps = [
    { id: 'booked', label: 'Booked', at: order.placedAt },
    { id: 'picking', label: 'Being picked', at: iso(addHours(start, -3)) },
    { id: 'on-its-way', label: 'On its way', at: iso(start) },
    { id: 'delivered', label: 'Delivered', at: iso(new Date(end.getTime() - 12 * 60_000)) },
  ].map(s => ({ ...s, done: new Date(s.at) <= now, time: clock(s.at) }));
  const current = [...steps].reverse().find(s => s.done) ?? steps[0];
  return { status: current.id, label: current.label, steps };
}

// The conversation: the cross-surface thread up to now, then everything said in the app.
export function conversation(world, state, current, storyThread) {
  const now = new Date(current.now);
  const earlier = storyThread.filter(m => new Date(m.at) <= now).map((m, i) => ({ id: `t${i}`, ...m }));
  return [...earlier, ...state.messages];
}

export function notifications(world, state, current) {
  const now = new Date(current.now);
  const out = [];
  const nudgeAt = new Date(world.household.demoClock);
  const nudge = current.storyHook?.nudge;
  if (nudge && nudgeAt <= now) out.push({ id: 'nudge', at: iso(nudgeAt), title: 'Pantry', body: nudge, route: 'today' });
  for (const order of state.orders) {
    const p = orderProgress(order, now);
    if (p.status === 'on-its-way') out.push({ id: `${order.id}-way`, at: order.slotStart, title: "Sainsbury's is on its way", body: `Arriving ${order.slotDay} ${order.slotWindow}. Two dozen eggs included.`, route: 'delivery' });
    if (p.status === 'delivered') out.push({ id: `${order.id}-done`, at: p.steps.at(-1).at, title: 'Delivered', body: 'Everything arrived. Eggs are back in.', route: 'delivery' });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function snapshot(world, state) {
  const current = plan(world, state);
  const next = planNext(world, state, current);
  const approval = [...state.approvals].reverse().find(a => ['pending', 'approved', 'charged'].includes(a.status)) ?? null;
  const now = new Date(current.now);
  const lastOrder = state.orders.at(-1) ?? null;
  const order = lastOrder && { ...lastOrder, progress: orderProgress(lastOrder, now) };
  const told = story({ world, current, next, state });
  return {
    household: world.household,
    inboxAddress: world.inboxAddress,
    products: Object.fromEntries(world.catalog.products.map(p => [p.sku, { sku: p.sku, family: p.family, name: p.name, price: p.price, pack: p.pack, art: p.art, image: p.image, kind: p.kind, source: p.source }])),
    driver: driverFromEnv().name,
    now: current.now,
    predictions: current.predictions.map(serialisePrediction),
    critical: current.critical ? serialisePrediction(current.critical) : null,
    slot: current.slot,
    cart: current.cart,
    lanes: current.lanes,
    deals: current.deals,
    totals: current.totals,
    hash: current.hash,
    identity: current.identity,
    inbox: current.inbox,
    next: next && { slot: next.slot, cart: next.cart, deals: next.deals, totals: next.totals, lanes: byLane(next.cart, world.household) },
    approval: approval && publicApproval(approval),
    order,
    story: told,
    messages: conversation(world, state, current, told.thread),
    notifications: notifications(world, state, { ...current, storyHook: told.hook }),
  };
}

const publicApproval = a => ({
  ...a,
  card: a.card ? { brand: a.card.brand, last4: a.card.last4, merchant: a.card.merchant, cap: a.card.cap, expiresAt: a.card.expiresAt, state: a.card.state } : null,
});

// ---- actions ---------------------------------------------------------------------------------------------

export function setClock(state, at) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) throw new Error('Not a time.');
  state.clock = iso(d);
  return state.clock;
}

// Edits replay in the order they were made, so a re-made edit moves to the end.
export function editCart(state, key, action, sku, qty) {
  if (!['exclude', 'include', 'swap', 'reset', 'qty', 'add'].includes(action)) throw new Error(`Unknown cart action: ${action}`);
  if (action === 'add') {
    if (!sku) throw new Error('add needs a sku');
    const k = `add:${sku}`;
    const prev = state.cartEdits[k];
    delete state.cartEdits[k];
    state.cartEdits[k] = { action: 'add', sku, qty: (prev?.qty ?? 0) + Math.max(1, Math.round(qty ?? 1)) };
    return state.cartEdits[k];
  }
  // Lines the human added carry their own edit: change it in place rather than replacing it.
  if (key?.startsWith('add:') && state.cartEdits[key]) {
    if (action === 'qty') return Object.assign(state.cartEdits[key], { qty: Math.max(1, Math.round(qty ?? 1)) });
    if (action === 'exclude' || action === 'reset') { delete state.cartEdits[key]; return null; }
  }
  delete state.cartEdits[key];
  if (action === 'reset') return null;
  if (action === 'qty') state.cartEdits[key] = { action, qty: Math.max(1, Math.round(qty ?? 1)) };
  else state.cartEdits[key] = sku ? { action, sku } : { action };
  return state.cartEdits[key];
}

export function requestCheckout(world, state) {
  const current = plan(world, state);
  if (!current.totals.count) throw new Error('Cart is empty.');
  if (state.orders.some(o => o.slotId === current.slot.id)) throw new Error(`${current.slot.day} is already booked and paid.`);
  return publicApproval(
    requestApproval(state, {
      merchant: MERCHANT,
      amount: current.totals.total,
      memo: `${current.totals.count} items · ${current.slot.day} ${current.slot.window} delivery`,
      cartHash: current.hash,
      slot: current.slot,
    }),
  );
}

// The human's Face ID tap. Only the stub driver can be approved from here; the real vault approves on the phone.
export function approveCheckout(world, state, approvalId, { driver = driverFromEnv(), checkoutAt } = {}) {
  if (driver.live) throw new VaultError('APPROVE_ON_PHONE', 'Live payments are approved with Face ID on the phone, not here.');
  const current = plan(world, state);
  const pending = state.approvals.find(a => a.id === approvalId);
  if (pending && pending.cartHash !== current.hash) {
    pending.status = 'superseded';
    throw new VaultError('CART_CHANGED', 'The cart changed after the request. Ask again so you approve what actually gets bought.');
  }
  const approved = approve(state, approvalId, { driver });
  const receipt = charge(state, approvalId, { driver, merchant: MERCHANT, amount: current.totals.total });
  const slot = current.slot;
  const booking = { id: shortId('bk'), slotId: slot.id, start: slot.start, end: slot.end, day: slot.day, date: slot.date, window: slot.window, fee: slot.fee, oneOff: true, status: 'booked', approval: approvalId };
  const placedAt = checkoutAt ?? new Date(current.now);
  const order = {
    id: `ord-pantry-${slot.id}`,
    type: 'pantry',
    placedAt: iso(placedAt),
    deliveredAt: slot.end,
    slotId: slot.id,
    slotStart: slot.start,
    slotEnd: slot.end,
    slotDay: slot.day,
    slotDate: slot.date,
    slotWindow: slot.window,
    slot: slot.window,
    lines: current.cart.lines.filter(l => l.status === 'in').map(l => ({ sku: l.sku, qty: l.qty, name: l.name, art: l.art, image: l.image, price: l.price, lane: l.lane })),
    count: current.totals.count,
    total: current.totals.total,
    card: { brand: approved.card.brand, last4: approved.card.last4, state: approved.card.state },
    approval: approvalId,
    receipt: receipt.id,
    booking: booking.id,
  };
  state.orders.push(order);
  state.inboxExtra.push({
    id: `m-confirm-${order.id}`,
    from: "Sainsbury's <orders@sainsburys.example>",
    receivedAt: iso(addHours(placedAt, 1 / 60)),
    subject: 'Thanks for your order',
    body: `Your order for ${booking.day} ${booking.window} is confirmed. Total ${gbp(order.total)}.`,
  });
  state.log.push({ at: iso(new Date()), event: 'order.placed', order: order.id, booking: booking.id, total: order.total });
  return { approval: publicApproval(approved), receipt, booking, order };
}

export function declineCheckout(state, approvalId) {
  return publicApproval(decline(state, approvalId));
}

export function acceptOffer(world, state, offerId) {
  const current = plan(world, state);
  const next = planNext(world, state, current);
  const offer = [...current.deals.offers, ...(next?.deals.offers ?? [])].find(o => o.id === offerId);
  if (!offer) throw new Error('That offer is gone.');
  state.preferences[offer.family] = {
    family: offer.family,
    from: offer.from.sku,
    to: offer.to.sku,
    reason: 'deal',
    dealId: offer.id,
    validFrom: offer.validFrom,
    validTo: offer.validTo,
    text: `${offer.label}: switched while it lasts.`,
    offer,
  };
  return { offer, saving: round2(offer.saving) };
}

// Keeping a substitute is a decision, not an external write: nothing is sent.
export function keepCase(world, state, caseId) {
  const existing = state.cases.find(c => c.id === caseId);
  if (existing) existing.status = 'kept';
  else state.cases.push({ id: caseId, status: 'kept', keptAt: iso(new Date()) });
  return { id: caseId, status: 'kept' };
}

// Filing a case is an external write: this is the human's one-tap approval.
export function fileCase(world, state, caseId) {
  const { inbox } = preferencesFor(world, state, householdNow(world, state));
  const found = inbox.cases.find(c => c.id === caseId);
  if (!found) throw new Error('No such case.');
  const existing = state.cases.find(c => c.id === caseId);
  if (existing) existing.status = 'filed';
  else state.cases.push({ id: caseId, status: 'filed', filedAt: iso(new Date()) });
  state.log.push({ at: iso(new Date()), event: 'case.filed', case: caseId, driver: 'stub' });
  return { ...found, status: 'filed' };
}
