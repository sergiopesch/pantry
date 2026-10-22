// The organiser's own records, for organisers without Luma Plus: one folder per past event holding the
// Luma guest CSV export, the provider's quote and invoice, and the debrief. Tonight's guests are
// guests.csv, the same export. This is the same snapshot shape syncLuma returns.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importGuests } from './luma.js';
import { venueFromLuma } from './luma-api.js';

export function readArchive(dir, settings) {
  const root = join(dir, 'archive');
  const past = (existsSync(root) ? readdirSync(root).sort() : []).map(name => {
    const meta = JSON.parse(readFileSync(join(root, name, 'event.json'), 'utf8'));
    const g = importGuests(readFileSync(join(root, name, 'luma-guests.csv'), 'utf8')).guests;
    return { lumaEventId: meta.lumaEventId, name: meta.name, kind: meta.kind, ticket: meta.ticket, date: meta.date, signedUp: g.length, attended: g.filter(x => x.checkedIn).length, folder: name };
  });
  const tonight = importGuests(readFileSync(join(dir, 'guests.csv'), 'utf8'));
  return {
    source: 'luma-csv',
    syncedAt: new Date().toISOString(),
    event: {
      lumaEventId: settings.lumaEventId, name: settings.name, url: null, kind: settings.kind, ticket: settings.ticket,
      doors: settings.doors, ends: settings.ends,
      venue: settings.venue.address ? venueFromLuma({ geo_address_json: { address: settings.venue.name, full_address: settings.venue.address } }) : { name: settings.venue.name, address: null, postcodeArea: null, coordinate: null },
      dietQuestion: tonight.dietQuestion,
    },
    guests: { guests: tonight.guests, waitlist: tonight.waitlist, declined: tonight.declined },
    past,
  };
}
