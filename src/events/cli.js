// pantry event <command> — the bot's hands for event catering. Called from src/cli.js.
import { readFileSync } from 'node:fs';
import {
  approvePayment, choose, debrief, declinePayment, draftBrief, eventOptions, eventSnapshot, freshEventState, importGuestFile,
  loadEventState, loadEventWorld, providerLedger, recordQuote, requestPayment, saveEventState, setHeadcount,
} from './index.js';
import { driverFromEnv } from '../vault.js';
import { clock, gbp, longDate, pct } from '../util.js';

export const EVENT_HELP = `pantry event <command> — catering for the people who actually turn up

  sync                      Re-read guests: Luma CSV exports, or the Luma API with LUMA_API_KEY (Luma Plus)
  show                      The event: venue, times, budget
  import <luma.csv>         Import a Luma guest export (sign-ups and dietary answers)
  headcount [n|auto]        Forecast turnout from past events, or set your own number
  diets                     Declared needs, counted. Allergies and coeliac planned at 100%
  options [tier]            Every provider: supermarket, caterer, restaurant. Why each is in or out
  plan                      The recommended plan: plates by lane, cost, logistics
  choose <provider|recommended>
  quote <provider> <£> [note]  Record a provider's quote; it replaces the estimate
  brief                     Draft the catering brief (sending it is your call)
  pay                       Ask the organiser to approve payment (never pays by itself)
  approve <id>              Stub only: stands in for the organiser's approval on their phone
  decline <id>
  status                    Latest approval and order
  inbox                     Pantry's own inbox, triaged
  providers                 The provider ledger: ratings, punctuality, what ran out
  debrief <attended> [leftover%] [rating] [minsLate]   After the event: learn for next time
  reset`;

export async function runEvent(rest, out) {
  const state = loadEventState();
  const hadLuma = Boolean(state.luma);
  const world = await loadEventWorld(state, { refresh: rest[0] === 'sync' });
  if (!hadLuma) saveEventState(state);
  const snap = () => eventSnapshot(world, state);
  const [sub, ...args] = rest;
  const save = () => saveEventState(state);
  switch (sub) {
    case 'sync': {
      const l = state.luma;
      saveEventState(state);
      return out(`Read Luma (${l.source === 'luma-api' ? 'live API' : 'CSV exports, no Luma Plus'}): ${l.event.name}, ${l.guests.guests.length} going, ${l.guests.waitlist} waitlisted. ${l.past.length} past events with check-ins.`, { source: l.source, event: l.event, going: l.guests.guests.length, waitlist: l.guests.waitlist, past: l.past });
    }
    case 'show': {
      const e = world.event;
      return out(`${e.name}  ${e.url ?? ''}\n  ${longDate(e.serve)} · doors ${clock(e.doors)} · food ${clock(e.serve)}\n  ${e.venue.name}${e.venue.address ? `, ${e.venue.address}` : ` (${e.venue.confirm})`}\n  Budget ${gbp(e.budget.total)} (${e.budget.payer}) · source: ${world.source}`, e);
    }
    case 'import': {
      if (!args[0]) throw new Error('usage: pantry event import <luma-export.csv>');
      const r = importGuestFile(state, readFileSync(args[0] === '-' ? 0 : args[0], 'utf8'));
      save();
      return out(`Imported ${r.imported} approved guests (${r.waitlist} on the waitlist, ${r.declined} declined). Diet question: "${r.dietQuestion ?? 'none found'}".`, r);
    }
    case 'headcount': {
      if (args[0]) setHeadcount(state, args[0] === 'auto' ? null : args[0]), save();
      const h = snap().headcount;
      return out([h.text, ...h.basis.map(b => `  ${b.date}  ${b.name.padEnd(26)} ${String(b.attended).padStart(3)}/${b.signedUp}  ${pct(b.rate)}`), `  Allergies and coeliac planned at 100%: ${h.criticalAt100} guests`].join('\n'), h);
    }
    case 'diets': {
      const d = snap().diets;
      return out([`${d.declared} of ${d.signedUp} declared a need.`, ...d.needs.map(n => `  ${n.label.padEnd(12)} ${String(n.count).padStart(3)}${n.critical ? '  planned at 100%' : ''}`), ...d.preferences.map(p => `  ${p.label.padEnd(12)} ${String(p.count).padStart(3)}  preference`)].join('\n'), d);
    }
    case 'options': {
      const r = eventOptions(world, state, args[0]);
      return out(r.options.map(o => `${o.eligible ? '✓' : '✗'} ${o.name.padEnd(22)} ${o.tier.padEnd(11)} ${gbp(o.cost.total).padStart(9)}  ${gbp(o.cost.perExpected)}/head${o.eligible ? `  score ${o.score}` : `  ${o.excluded[0]}`}`).join('\n'), r);
    }
    case 'plan': {
      const p = snap().plan;
      if (!p.chosen) return out(p.text, p);
      return out([p.text, '', ...p.lanes.map(l => `${l.label}\n${l.lines.map(x => `  ${String(x.qty).padStart(3)} × ${x.name}`).join('\n')}`), '', ...p.logistics.map(l => `  · ${l}`), '', `Budget ${gbp(p.budget.total)} · spend ${gbp(p.budget.spend)} · left ${gbp(p.budget.left)}`].join('\n'), p);
    }
    case 'choose': {
      choose(world, state, args[0]);
      save();
      const p = snap().plan;
      return out(p.text, p);
    }
    case 'quote': {
      const q = recordQuote(world, state, { provider: args[0], amount: args[1], note: args.slice(2).join(' ') || null });
      save();
      return out(`Recorded ${gbp(q.amount)} from ${args[0]}.`, q);
    }
    case 'brief': {
      const b = draftBrief(world, state);
      save();
      return out(`${b.text}\n\n[${b.note}]`, b);
    }
    case 'pay': {
      const a = requestPayment(world, state);
      save();
      return out(`${a.prompt}\nApproval ${a.id} is ${a.status}. The organiser approves it; Pantry cannot.`, a);
    }
    case 'approve': {
      const driver = driverFromEnv();
      if (driver.live) throw new Error('Live payments are approved by the organiser on their phone. This command only exists for the stub driver.');
      console.error('[stub] Standing in for the organiser\'s approval. No money moves.');
      const r = approvePayment(world, state, args[0], { driver });
      save();
      return out(`Paid ${gbp(r.receipt.amount)} to ${r.order.name}. Card ${r.approval.card.last4} is ${r.approval.card.state}. Lands ${clock(r.order.dropAt)}.`, r);
    }
    case 'decline': {
      const a = declinePayment(state, args[0]);
      save();
      return out(`Declined ${a.id}.`, a);
    }
    case 'status': {
      const s = snap();
      return out(s.approval ? `Approval ${s.approval.id}: ${s.approval.status}${s.order ? ` · order ${s.order.id}, ${s.order.plates} plates, lands ${clock(s.order.dropAt)}` : ''}` : 'No approval requested yet.', { approval: s.approval, order: s.order });
    }
    case 'inbox': {
      const i = snap().inbox;
      return out([i.text, ...i.items.map(m => `  ${m.action.padEnd(13)} ${m.subject} — ${m.note}`)].join('\n'), i);
    }
    case 'providers': {
      const l = providerLedger(world, state);
      return out(l.map(p => `${p.name.padEnd(22)} ${p.tier.padEnd(11)} ${p.events ? `${p.rating.toFixed(1)}★  on time ${pct(p.onTime)}${p.ranOut.length ? `  ran out: ${p.ranOut.join(', ')}` : ''}` : 'no history yet'}`).join('\n'), l);
    }
    case 'debrief': {
      const [attended, leftover, rating, minsLate] = args;
      const r = debrief(world, state, { attended, leftoverPct: leftover, rating, minsLate: Number(minsLate ?? 0) });
      save();
      return out(r.learnings.join('\n'), r);
    }
    case 'reset': {
      saveEventState(freshEventState());
      return out('Event state reset.', { ok: true });
    }
    default:
      console.log(EVENT_HELP);
  }
}

