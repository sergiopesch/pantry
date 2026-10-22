#!/usr/bin/env node
// Pantry as an MCP server (stdio, newline-delimited JSON-RPC). Register it as a tool server for the bot.
// Deliberately missing: approve, charge, send. Money and anything that leaves the computer need a human.
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import {
  choose, debrief, draftBrief, eventOptions, eventSnapshot, importGuestFile, loadEventState, loadEventWorld,
  providerLedger, recordQuote, requestPayment, saveEventState, setHeadcount,
} from './events/index.js';

const obj = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

const TOOLS = [
  {
    name: 'pantry_luma_sync',
    description: 'Re-read who is coming (read-only): tonight\'s guests and dietary answers, and sign-up vs check-in counts for every past event. From the organiser\'s Luma CSV exports, or the live Luma API when LUMA_API_KEY (Luma Plus) is set.',
    inputSchema: obj(),
    mutates: true,
    refresh: true,
    run: (_, w, state) => ({ source: state.luma.source, syncedAt: state.luma.syncedAt, event: state.luma.event, going: state.luma.guests.guests.length, waitlist: state.luma.guests.waitlist, past: state.luma.past }),
  },
  {
    name: 'pantry_event',
    description: 'The event: name, doors and serving times, venue (address, postcode area, access notes), budget and payer.',
    inputSchema: obj(),
    run: (_, w) => w.event,
  },
  {
    name: 'pantry_guests_import',
    description: 'Import a Luma guest export (CSV file path on this computer). Reads approved guests and their declared dietary answers. Local only.',
    inputSchema: obj({ file: { type: 'string' } }, ['file']),
    mutates: true,
    run: (a, w, state) => importGuestFile(state, readFileSync(a.file, 'utf8')),
  },
  {
    name: 'pantry_headcount',
    description: 'Sign-ups, the show rate learned from past events (with the events it came from), the number to plan for including spare, and how many allergy or coeliac guests are planned at 100%.',
    inputSchema: obj(),
    run: (_, w, s) => eventSnapshot(w, s).headcount,
  },
  {
    name: 'pantry_headcount_set',
    description: "Override the number to plan for with the organiser's own figure, or pass null to go back to the forecast. Draft only.",
    inputSchema: obj({ planFor: { type: ['integer', 'null'] } }, ['planFor']),
    mutates: true,
    run: (a, w, state) => setHeadcount(state, a.planFor),
  },
  {
    name: 'pantry_diets',
    description: 'Declared dietary needs, counted (aggregate only, no names), plus preferences and the coverage rules. Diets come only from what guests declared.',
    inputSchema: obj(),
    run: (_, w, s) => eventSnapshot(w, s).diets,
  },
  {
    name: 'pantry_options',
    description: 'Every provider option across tiers (supermarket, caterer, restaurant): plates by lane, total, cost per expected guest, diet coverage, order-by and drop times, score, and the reasons any option is excluded.',
    inputSchema: obj({ tier: { type: 'string', enum: ['supermarket', 'caterer', 'restaurant'] } }),
    run: (a, w, s) => eventOptions(w, s, a.tier),
  },
  {
    name: 'pantry_plan',
    description: 'The recommended (or chosen) plan: plates by lane (Everyone, Vegan, Gluten-free, Allergy-safe), cost against budget, logistics checklist, alternatives, and a one-line take.',
    inputSchema: obj(),
    run: (_, w, s) => eventSnapshot(w, s).plan,
  },
  {
    name: 'pantry_plan_choose',
    description: 'Pick a different provider by id, or "recommended" to go back. Draft only.',
    inputSchema: obj({ option: { type: 'string' } }, ['option']),
    mutates: true,
    run: (a, w, state) => choose(w, state, a.option),
  },
  {
    name: 'pantry_quote_record',
    description: "Record a provider's quoted price (from email or a call). It replaces the estimate in options and plan.",
    inputSchema: obj({ provider: { type: 'string' }, amount: { type: 'number' }, note: { type: 'string' } }, ['provider', 'amount']),
    mutates: true,
    run: (a, w, state) => recordQuote(w, state, a),
  },
  {
    name: 'pantry_brief',
    description: 'Draft the catering brief for the chosen provider: headcount, plates, needs and allergens, budget, drop time, venue access. Drafted only; sending it needs the organiser.',
    inputSchema: obj(),
    mutates: true,
    run: (_, w, state) => draftBrief(w, state),
  },
  {
    name: 'pantry_checkout_request',
    description: 'Ask the organiser to approve payment for the chosen plan. Returns a pending approval bound to provider, amount and plan. Pantry cannot approve it.',
    inputSchema: obj(),
    mutates: true,
    run: (_, w, state) => requestPayment(w, state),
  },
  {
    name: 'pantry_status',
    description: 'Latest approval (pending / approved / charged / declined / void) and the order it produced.',
    inputSchema: obj(),
    run: (_, w, s) => { const x = eventSnapshot(w, s); return { approval: x.approval, order: x.order }; },
  },
  {
    name: 'pantry_inbox',
    description: "Pantry's own inbox, triaged: filed quietly, learned rules (e.g. the venue's delivery cut-off), drafted replies, and what needs the organiser.",
    inputSchema: obj(),
    run: (_, w, s) => eventSnapshot(w, s).inbox,
  },
  {
    name: 'pantry_providers',
    description: 'The provider ledger: rating, punctuality, what ran out, and notes from every past event, plus any recorded quote.',
    inputSchema: obj(),
    run: (_, w, s) => providerLedger(w, s),
  },
  {
    name: 'pantry_debrief',
    description: 'After the event: record who came and how the food went. Returns learnings; the next plan uses them.',
    inputSchema: obj({
      attended: { type: 'integer' }, leftoverPct: { type: 'number' }, onTime: { type: 'boolean' }, minsLate: { type: 'integer' },
      rating: { type: 'number' }, ranOut: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' },
    }, ['attended']),
    mutates: true,
    run: (a, w, state) => debrief(w, state, a),
  },
];

const send = msg => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function callTool(name, args = {}) {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) throw Object.assign(new Error(`Unknown tool: ${name}`), { rpc: -32602 });
  const state = loadEventState();
  const hadLuma = Boolean(state.luma);
  const world = await loadEventWorld(state, { refresh: tool.refresh });
  const result = tool.run(args, world, state);
  if (tool.mutates || !hadLuma) saveEventState(state);
  return result;
}

createInterface({ input: process.stdin }).on('line', async line => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return fail(null, -32700, 'Parse error');
  }
  const { id, method, params = {} } = msg;
  if (id === undefined) return; // notifications (e.g. notifications/initialized)
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: params.protocolVersion ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'pantry', version: '0.1.0' },
          instructions: 'Pantry plans catering for community events. Read with pantry_headcount / pantry_diets / pantry_options / pantry_plan; edit the draft freely; checkout only creates an approval request. Never claim a purchase happened until pantry_status says charged.',
        });
      case 'ping':
        return reply(id, {});
      case 'tools/list':
        return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      case 'tools/call':
        try {
          const result = await callTool(params.name, params.arguments);
          return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
        } catch (err) {
          if (err.rpc) return fail(id, err.rpc, err.message);
          return reply(id, { content: [{ type: 'text', text: err.message }], isError: true });
        }
      default:
        return fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return fail(id, -32603, err.message);
  }
});
