#!/usr/bin/env node
// Pantry as an MCP server (stdio, newline-delimited JSON-RPC). Register it as a tool server for the bot.
// Deliberately missing: approve, charge, send. Money and anything that leaves the computer need a human.
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import {
  addProvider, attachPaymentLink, choose, setDish, confirmPayment, debrief, draftBrief, eventOptions, eventSnapshot, importGuestFile,
  loadEventState, loadEventWorld, providerLedger, recordQuote, requestPayment, saveEventState, setEvent, setHeadcount,
} from './events/index.js';
import { card, CARD_KINDS } from './events/cards.js';

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
    name: 'pantry_event_set',
    description: "Set the upcoming event from the organiser's Notion page: name, start (ISO 8601 with offset), optional serveAt, kind (meetup|hackathon|workshop|social), ticket (free|paid), venue {name, address, deliveriesBefore 'HH:MM', access[]}, budget {total, payer}, source (the Notion URL). Draft only.",
    inputSchema: obj({
      name: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, serveAt: { type: 'string' },
      kind: { type: 'string' }, ticket: { type: 'string', enum: ['free', 'paid'] }, source: { type: 'string' },
      venue: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, deliveriesBefore: { type: 'string' }, access: { type: 'array', items: { type: 'string' } } } },
      budget: { type: 'object', properties: { total: { type: 'number' }, payer: { type: 'string' } }, required: ['total'] },
    }, ['name', 'start', 'budget']),
    mutates: true,
    run: (a, w, state) => setEvent(state, a),
  },
  {
    name: 'pantry_event',
    description: 'The upcoming event as set from Notion: name, doors and serving times, venue (address, postcode area, delivery cut-off, access), budget. Also the current time.',
    inputSchema: obj(),
    run: (_, w) => ({ now: new Date().toISOString(), event: w.event ?? 'No event yet. Read it from Notion and call pantry_event_set.' }),
  },
  {
    name: 'pantry_provider_add',
    description: 'Add a real provider you found for this event (supermarket, caterer or restaurant), with a source URL for the facts. dishes: [{name, price per portion in £ incl. VAT, tags from: meat, pork, fish, vegetarian, vegan, halal, gluten-free, coeliac-safe, dairy-free, nut-free, sealed, spicy}]. fulfilment {type delivery|collection, fee, leadHours}, minOrder, deliversTo (postcode areas), allergens (sealed-labelled|labelled|kitchen-may-contain|unknown). Unknown allergen handling counts as may-contain. reviews {rating out of 5, count, source} is the public review score, used until there is own history.',
    inputSchema: obj({
      name: { type: 'string' }, tier: { type: 'string', enum: ['supermarket', 'caterer', 'restaurant'] }, source: { type: 'string' },
      dishes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name', 'price'] } },
      fulfilment: { type: 'object', properties: { type: { type: 'string' }, fee: { type: 'number' }, leadHours: { type: 'number' }, travelMins: { type: 'number' }, label: { type: 'string' } } },
      minOrder: { type: 'number' }, maxPortions: { type: 'number' }, deliversTo: { type: 'array', items: { type: 'string' } },
      allergens: { type: 'string', enum: ['sealed-labelled', 'labelled', 'kitchen-may-contain', 'unknown'] },
      extras: { type: 'object', properties: { label: { type: 'string' }, perHead: { type: 'number' } } }, notes: { type: 'array', items: { type: 'string' } },
      reviews: { type: 'object', properties: { rating: { type: 'number' }, count: { type: 'number' }, source: { type: 'string' } } },
    }, ['name', 'tier', 'source', 'dishes']),
    mutates: true,
    run: (a, w, state) => addProvider(state, a),
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
    name: 'pantry_plan_item',
    description: "Select items: remove a dish from (or add it back to) a provider's menu for this plan, by provider id or name and dish id or part of its name. The plan re-spreads the plates and still guarantees a safe plate for every declared need. Draft only.",
    inputSchema: obj({ provider: { type: 'string' }, dish: { type: 'string' }, action: { type: 'string', enum: ['remove', 'add'] } }, ['provider', 'dish', 'action']),
    mutates: true,
    run: (a, w, state) => setDish(w, state, a),
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
    name: 'pantry_payment_link',
    description: "Attach the payment link you created with the payment processor (e.g. a Stripe Payment Link for exactly the approval's amount) to a pending approval. The organiser pays it themselves; you never pay.",
    inputSchema: obj({ approvalId: { type: 'string' }, url: { type: 'string' }, reference: { type: 'string' }, processor: { type: 'string' } }, ['approvalId', 'url']),
    mutates: true,
    run: (a, w, state) => attachPaymentLink(state, a),
  },
  {
    name: 'pantry_payment_confirm',
    description: "Record a payment only after the processor reports it settled. With Agentcard: processor 'agentcard', card = the single-use card id, reference = the transaction id, status as list_transactions reports it (SETTLED), sandbox true in the demo environment, amount = the approved amount in £. Anything not settled, or a different amount, records nothing.",
    inputSchema: obj({ approvalId: { type: 'string' }, reference: { type: 'string' }, amount: { type: 'number' }, status: { type: 'string' }, processor: { type: 'string' }, card: { type: 'string' }, sandbox: { type: 'boolean' } }, ['approvalId', 'amount', 'status']),
    mutates: true,
    run: (a, w, state) => confirmPayment(w, state, a),
  },
  {
    name: 'pantry_card',
    description: "A visual card for the answer, as an HTML fragment for Grok Bot's Visualize tool (pass html and title; use alt as the text fallback). kinds: dish (pass dish: one card per meal of the chosen plan), headcount, diets, options, provider (pass provider id or name: one card per provider while you walk through them), plan, order (the basket before paying), inbox, payment (Agentcard track), debrief, memory (needs finding and date). One card per answer at most, only when numbers or a comparison beat text.",
    inputSchema: obj({ kind: { type: 'string', enum: CARD_KINDS }, provider: { type: 'string' }, dish: { type: 'string' }, finding: { type: 'string' }, date: { type: 'string' }, dataset: { type: 'string' } }, ['kind']),
    run: (a, w, s) => {
      if (a.kind === 'memory') return card('memory', null, { finding: a.finding, date: a.date, dataset: a.dataset ?? 'pantry-events' });
      const snap = eventSnapshot(w, s);
      if (a.kind === 'options') return card('options', snap, { options: eventOptions(w, s).options });
      if (a.kind === 'provider') {
        const option = eventOptions(w, s).options.find(o => o.id === a.provider || o.name.toLowerCase().startsWith(String(a.provider ?? '').toLowerCase()));
        if (!option) throw new Error('Pass provider: the id or name of one of the options.');
        return card('provider', snap, { option, provider: w.providers.find(p => p.id === option.id) });
      }
      if (a.kind === 'order') return card('order', snap, { plan: snap.plan, approval: snap.approval });
      if (a.kind === 'dish') return card('dish', snap, { option: snap.plan.chosen, dish: a.dish });
      if (a.kind === 'debrief') {
        const last = s.debriefs.at(-1);
        if (!last) throw new Error('No debrief recorded yet.');
        return card('debrief', snap, { record: last, learnings: s.lastLearnings ?? [] });
      }
      return card(a.kind, snap);
    },
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
          instructions: 'Pantry plans catering for community events. Start with pantry_event_set (from Notion) and pantry_guests_import. Read with pantry_headcount / pantry_diets / pantry_options / pantry_plan; edit the draft freely; checkout only creates an approval request. Never claim a purchase happened until pantry_status says charged.',
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
