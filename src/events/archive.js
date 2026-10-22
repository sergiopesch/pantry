// The organiser's own records, for organisers without Luma Plus: one folder per past event holding the
// Luma guest CSV export, the provider's quote and invoice, and the debrief (the same records Pantry keeps
// in Notion). Returns sign-up and check-in counts per event.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importGuests } from './luma.js';

export function readPast(dir) {
  const root = join(dir, 'archive');
  return (existsSync(root) ? readdirSync(root).sort() : []).map(name => {
    const meta = JSON.parse(readFileSync(join(root, name, 'event.json'), 'utf8'));
    const g = importGuests(readFileSync(join(root, name, 'luma-guests.csv'), 'utf8')).guests;
    return { lumaEventId: meta.lumaEventId, name: meta.name, kind: meta.kind, ticket: meta.ticket, date: meta.date, signedUp: g.length, attended: g.filter(x => x.checkedIn).length, folder: name };
  });
}
