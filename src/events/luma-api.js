// Luma's public API (https://public-api.luma.com, OpenAPI at /openapi.json). Needs Luma Plus and a
// calendar API key in the x-luma-api-key header. Pantry only reads: List Events, Get Event, List Guests.
// Without Luma Plus, organisers use Luma's guest CSV export instead (see archive.js).
import { readDiet } from './luma.js';

export const LUMA_BASE = 'https://public-api.luma.com';

export function liveClient({ apiKey, fetchImpl = globalThis.fetch, base = LUMA_BASE }) {
  async function get(path, params = {}) {
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
    const res = await fetchImpl(url, { headers: { 'x-luma-api-key': apiKey, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Luma ${path} answered ${res.status}${res.status === 401 ? ': check the API key (Luma Plus, one key per calendar)' : ''}`);
    return res.json();
  }
  async function all(path, params) {
    const entries = [];
    let cursor;
    do {
      const page = await get(path, { ...params, pagination_cursor: cursor, pagination_limit: 100 });
      entries.push(...page.entries);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return entries;
  }
  return {
    source: 'luma-api',
    listEvents: () => all('/v1/calendars/events/list', { sort_column: 'start_at' }),
    getEvent: id => get('/v1/events/get', { event_id: id }),
    listGuests: id => all('/v1/events/guests/list', { event_id: id }),
  };
}

// --- Luma shapes -> Pantry --------------------------------------------------------------------------

const DIET_LABEL = /diet|allerg|food/i;

export function guestFromLuma(entry) {
  const answer = (entry.registration_answers ?? []).find(a => DIET_LABEL.test(a.label));
  const text = Array.isArray(answer?.value) ? answer.value.join(', ') : typeof answer?.value === 'string' ? answer.value : '';
  return {
    ref: entry.id,
    name: entry.user_name ?? [entry.user_first_name, entry.user_last_name].filter(Boolean).join(' '),
    status: entry.approval_status,
    checkedIn: (entry.event_tickets ?? []).some(t => t.checked_in_at),
    answer: text,
    ...readDiet(text),
  };
}

const UK_POSTCODE = /\b([A-Z]{1,2})\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

export function venueFromLuma(event) {
  const geo = event.geo_address_json ?? {};
  const full = geo.full_address ?? null;
  return {
    name: geo.address ?? event.name,
    address: full,
    postcodeArea: full?.match(UK_POSTCODE)?.[1]?.toUpperCase() ?? null,
    coordinate: event.coordinate ?? null,
  };
}

export const kindOf = name => (/hack/i.test(name) ? 'hackathon' : 'meetup');
export const ticketOf = e => (e.display_price ? 'paid' : 'free');

// Reads the calendar and returns tonight's event, its guests, and every past in-person event with its
// real sign-up and check-in counts. `eventId` pins the event; otherwise the next one after `now`.
export async function syncLuma(client, { eventId, now }) {
  const events = (await client.listEvents()).filter(e => e.location_type === 'offline');
  const at = new Date(now);
  const next = eventId ? events.find(e => e.id === eventId) : events.filter(e => new Date(e.end_at) > at).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
  if (!next) throw new Error(eventId ? `No Luma event ${eventId} on this calendar.` : 'No upcoming in-person event on this Luma calendar.');
  const detail = await client.getEvent(next.id);
  const ev = detail.event ?? detail;
  const guests = (await client.listGuests(next.id)).map(guestFromLuma);
  const past = [];
  for (const e of events.filter(x => new Date(x.end_at) <= at)) {
    const g = (await client.listGuests(e.id)).map(guestFromLuma).filter(x => x.status === 'approved');
    past.push({ lumaEventId: e.id, name: e.name, kind: kindOf(e.name), ticket: ticketOf(e), date: e.start_at.slice(0, 10), signedUp: g.length, attended: g.filter(x => x.checkedIn).length });
  }
  return {
    source: client.source,
    syncedAt: new Date().toISOString(),
    event: {
      lumaEventId: ev.id, name: ev.name, url: ev.url, kind: kindOf(ev.name), ticket: ticketOf(ev),
      doors: ev.start_at, ends: ev.end_at, venue: venueFromLuma(ev),
      dietQuestion: (ev.registration_questions ?? []).find(q => DIET_LABEL.test(q.label))?.label ?? null,
    },
    guests: { guests: guests.filter(g => g.status === 'approved'), waitlist: guests.filter(g => g.status === 'waitlist').length, declined: guests.filter(g => g.status === 'declined').length },
    past,
  };
}
