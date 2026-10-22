#!/usr/bin/env node
// pantry <command> — the bot's hands on its cloud computer. Human-readable by default, --json for tools,
// --demo to narrate one short sentence per action.
import { readFileSync } from 'node:fs';
import { freshState, indexCatalog, loadState, loadWorld, readJson, saveState, writeJson } from './data.js';
import { acceptOffer, approveCheckout, declineCheckout, editCart, fileCase, requestCheckout, setClock, snapshot } from './pantry.js';
import { say } from './chat.js';
import { driverFromEnv } from './vault.js';
import { importCaptured } from './sainsburys/catalog.js';
import { clock, gbp, longDate, shortDay } from './util.js';

const HELP = `pantry — Pantry's engine for the household's weekly shop

  household                 Who's in the house and their rules
  predict                   What runs out, and when
  identity                  When the basket drifted, and toward what
  cart [--next]             This week's cart split by person (or next week's draft)
  edit <key> <include|exclude|swap|reset> [sku]
  deals [--next]            Deals matched to the predicted cart; everything else ignored
  slot                      The one-off delivery slot Pantry would book
  checkout                  Ask the human to approve payment (never pays by itself)
  status                    Latest approval and order
  approve <id>              Stub driver only: stands in for Face ID on the phone
  decline <id>              Decline a pending approval
  offer <id>                Accept a deal switch for next week's cart
  inbox                     Triage Pantry's own inbox
  say "<text>"              Talk to Pantry, as you would in the app
  clock <iso>               Move the household clock (e.g. 2026-10-22T16:30:00+01:00)
  file-case <id>            File a drafted retailer case (a human approval)
  catalog import <file|->   Merge products captured from the live site (--dry-run to preview)
  reset                     Reset demo state

  --json   machine output   --demo   narrate each action`;

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [cmd, ...rest] = args.filter(a => !a.startsWith('--'));
const json = flags.has('--json');
const demo = flags.has('--demo');

const world = loadWorld();
const state = loadState();
const out = (human, data) => console.log(json ? JSON.stringify(data, null, 2) : human);
const narrate = lines => demo && !json && lines.filter(Boolean).forEach(l => console.log(`  › ${l}`));
const name = n => String(n).replace(/^Sainsbury's\s+/i, '');

function cartText(cart, totals, household) {
  const lanes = Object.entries(household.lanes).map(([id, label]) => {
    const lines = cart.lines.filter(l => l.lane === id);
    if (!lines.length) return null;
    return [`${label}`, ...lines.map(l => `  ${l.status === 'out' ? '·' : '•'} ${l.qty} × ${name(l.name)}  ${gbp(l.price)}${l.deal ? `  (${l.deal.label} −${gbp(l.deal.saving)})` : ''}${l.replaced ? `  [${l.replaced.reason}]` : ''}  key=${l.key}`)].join('\n');
  }).filter(Boolean);
  const left = cart.leftOut.length ? `Left off: ${cart.leftOut.map(l => `${name(l.name)} (key=${l.key})`).join(', ')}` : '';
  const skipped = cart.skipped.length ? `Not needed yet: ${cart.skipped.map(s => `${name(s.name)} (till ${shortDay(s.runsOutAt)} ${longDate(s.runsOutAt).split(' ').slice(1).join(' ')})`).join(', ')}` : '';
  const sum = `${totals.count} things · items ${gbp(totals.subtotal)} − deals ${gbp(totals.savings)} + slot ${gbp(totals.fee)} = ${gbp(totals.total)}`;
  return [...lanes, left, skipped, sum].filter(Boolean).join('\n\n');
}

function run() {
  const snap = () => snapshot(world, state);
  switch (cmd) {
    case 'household': {
      const h = world.household;
      return out([h.name, ...h.members.map(m => `  ${m.name} (${m.role}${m.age ? `, ${m.age}` : ''}): ${m.summary}`), `  ${h.conflictPolicy}`].join('\n'), h);
    }
    case 'predict': {
      const s = snap();
      narrate(s.story.hook?.lines ?? []);
      return out(s.predictions.map(p => `${p.family.padEnd(15)} ${p.perWeek.toFixed(1).padStart(7)} ${p.unit}/wk   out ${shortDay(p.runsOutAt)} ${clock(p.runsOutAt).padEnd(8)} (${p.confidence})`).join('\n'), s.predictions);
    }
    case 'identity': {
      const s = snap();
      narrate(s.story.identity.lines);
      const { shops, ...summary } = s.identity;
      return out(s.identity.drifted ? [s.identity.text, s.identity.detail, s.identity.shift, s.identity.fix].join('\n') : s.identity.text, flags.has('--full') ? s.identity : summary);
    }
    case 'cart': {
      const s = snap();
      if (flags.has('--next')) {
        if (!s.next) return out('No slot next week yet.', null);
        return out(`Next week's draft · ${s.next.slot.day} ${s.next.slot.window}\n\n${cartText(s.next.cart, s.next.totals, world.household)}`, s.next);
      }
      narrate(s.story.split.lines);
      return out(`${s.slot.day} ${s.slot.window} · ${s.slot.date}\n\n${cartText(s.cart, s.totals, world.household)}`, { slot: s.slot, cart: s.cart, totals: s.totals, lanes: s.lanes });
    }
    case 'edit': {
      const [key, action, sku] = rest;
      if (!key || !action) throw new Error('usage: pantry edit <key> <include|exclude|swap|reset> [sku]');
      editCart(state, key, action, sku);
      saveState(state);
      const s = snap();
      return out(`OK. ${s.totals.count} things, ${gbp(s.totals.total)}.`, { edit: state.cartEdits[key] ?? null, totals: s.totals });
    }
    case 'deals': {
      const s = snap();
      const d = flags.has('--next') ? s.next?.deals : s.deals;
      narrate(s.story.deals.lines);
      const text = [
        ...d.clipped.map(c => `clipped  ${c.label}: ${name(c.name)}  −${gbp(c.saving)}`),
        ...d.offers.map(o => `offer    ${o.label}: ${o.from.qty} × ${name(o.from.name)} → ${o.to.qty} × ${name(o.to.name)}  −${gbp(o.saving)}  (id=${o.id})`),
        ...d.ignored.map(i => `ignored  ${i.label}: ${name(i.name)} — ${i.why}`),
      ].join('\n');
      return out(text || 'No deals.', d);
    }
    case 'slot': {
      const s = snap();
      return out(`${s.slot.day} ${s.slot.window} (${s.slot.date}) · one-off ${gbp(s.slot.fee)} · lands ${s.slot.landsBefore} before ${s.slot.family} run out`, s.slot);
    }
    case 'checkout': {
      const approval = requestCheckout(world, state);
      saveState(state);
      narrate([approval.prompt, 'Waiting for Face ID on the phone.']);
      return out(`${approval.prompt}\nApproval ${approval.id} is ${approval.status}. A human approves it with Face ID; Pantry cannot.`, approval);
    }
    case 'status': {
      const s = snap();
      return out(s.approval ? `Approval ${s.approval.id}: ${s.approval.status}${s.order ? ` · order ${s.order.id} for ${s.slot.day} ${s.slot.window}` : ''}` : 'No approval requested yet.', { approval: s.approval, order: s.order });
    }
    case 'approve': {
      const driver = driverFromEnv();
      if (driver.live) throw new Error('Live payments are approved with Face ID on the phone. This command only exists for the stub driver.');
      if (!rest[0]) throw new Error('usage: pantry approve <approval-id>');
      console.error('[stub] Standing in for Face ID on the phone. No money moves.');
      const r = approveCheckout(world, state, rest[0], { driver });
      saveState(state);
      narrate(['Approved with Face ID.', 'Single-use card swapped in. Charge cleared. Card dead.', `${r.booking.day}, ${r.booking.window}.`]);
      return out(`Charged ${gbp(r.receipt.amount)} (${r.receipt.id}). Card ${r.approval.card.last4} is ${r.approval.card.state}. Booked ${r.booking.day} ${r.booking.window}.`, r);
    }
    case 'decline': {
      const a = declineCheckout(state, rest[0]);
      saveState(state);
      return out(`Declined ${a.id}.`, a);
    }
    case 'offer': {
      const r = acceptOffer(world, state, rest[0]);
      saveState(state);
      return out(`Switched. Next week's cart: ${gbp(r.saving)} less.`, r);
    }
    case 'inbox': {
      const s = snap();
      narrate([s.inbox.text]);
      return out([s.inbox.text, ...s.inbox.items.map(i => `  ${i.action.padEnd(13)} ${i.subject} — ${i.note}`), ...s.inbox.learnings.map(l => `  learned       ${l.text}`)].join('\n'), s.inbox);
    }
    case 'say': {
      const r = say(world, state, rest.join(' '));
      saveState(state);
      return out(`Pantry: ${r.answer.text}${r.answer.card ? `  [${r.answer.card.type}]` : ''}`, r);
    }
    case 'clock': {
      const at = setClock(state, rest[0]);
      saveState(state);
      return out(`Household clock: ${at}`, { clock: at });
    }
    case 'file-case': {
      const c = fileCase(world, state, rest[0]);
      saveState(state);
      return out(`Filed ${c.id} [stub]: ${c.text}`, c);
    }
    case 'catalog': {
      if (rest[0] !== 'import' || !rest[1]) throw new Error('usage: pantry catalog import <file|-> [--dry-run]');
      const raw = readFileSync(rest[1] === '-' ? 0 : rest[1], 'utf8');
      const doc = readJson('catalog.json');
      const result = importCaptured(indexCatalog(doc), JSON.parse(raw));
      if (!flags.has('--dry-run')) {
        writeJson('catalog.backup.json', doc);
        writeJson('catalog.json', result.doc);
      }
      return out([`${flags.has('--dry-run') ? '[dry run] ' : ''}Matched ${result.matched.length}, unmatched ${result.unmatched.length}.`, ...result.matched.map(m => `  ${m.sku.padEnd(22)} ← ${m.name}${m.image ? '  [image]' : ''}`), ...result.unmatched.map(u => `  ?  ${u}`)].join('\n'), { matched: result.matched, unmatched: result.unmatched });
    }
    case 'reset': {
      saveState(freshState());
      return out('Demo state reset.', { ok: true });
    }
    default:
      console.log(HELP);
  }
}

try {
  run();
} catch (err) {
  console.error(json ? JSON.stringify({ error: err.message, code: err.code ?? null }) : `pantry: ${err.message}`);
  process.exit(1);
}
