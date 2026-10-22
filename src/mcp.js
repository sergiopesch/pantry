#!/usr/bin/env node
// Pantry as an MCP server (stdio, newline-delimited JSON-RPC). Register it as a tool server for the bot.
// Deliberately missing: approve, charge, file-case. Money and retailer writes need a human.
import { createInterface } from 'node:readline';
import { loadState, loadWorld, saveState } from './data.js';
import { acceptOffer, editCart, requestCheckout, snapshot } from './pantry.js';

const world = loadWorld();
const obj = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

const TOOLS = [
  {
    name: 'pantry_household',
    description: 'The household: members, dietary rules and the conflict policy (child wins on staples, grown-ups on treats).',
    inputSchema: obj(),
    run: () => world.household,
  },
  {
    name: 'pantry_predict',
    description: 'Consumption learned from basket history: per product family, weekly rate, stock now, and when it runs out. Use for proactive nudges.',
    inputSchema: obj(),
    run: (_, s) => ({ asOf: s.now, predictions: s.predictions, nudge: s.story.hook?.nudge ?? null }),
  },
  {
    name: 'pantry_identity',
    description: 'When the basket drifted toward processed food, the date it started, the items driving it, and the fix.',
    inputSchema: obj(),
    run: (_, s) => { const { shops, ...rest } = s.identity; return rest; },
  },
  {
    name: 'pantry_cart',
    description: "This week's cart split by person (Everyone / Grown-ups / Little one) with reasons, deals, left-off treats and totals. Set next=true for next week's draft.",
    inputSchema: obj({ next: { type: 'boolean' } }),
    run: (a, s) => (a.next ? s.next : { slot: s.slot, lanes: s.lanes, leftOut: s.cart.leftOut, skipped: s.cart.skipped, totals: s.totals, replacement: s.story.replacement }),
  },
  {
    name: 'pantry_cart_edit',
    description: 'Include, exclude or swap one cart line by its key (from pantry_cart), or bring back a left-off item with include. Local draft only; nothing is ordered.',
    inputSchema: obj({ key: { type: 'string' }, action: { type: 'string', enum: ['include', 'exclude', 'swap', 'reset'] }, sku: { type: 'string' } }, ['key', 'action']),
    mutates: true,
    run: (a, s, state) => { editCart(state, a.key, a.action, a.sku); return { ok: true }; },
  },
  {
    name: 'pantry_deals',
    description: 'Deals matched against the predicted cart: clipped, switch offers, and ignored offers with the reason. next=true for next week.',
    inputSchema: obj({ next: { type: 'boolean' } }),
    run: (a, s) => (a.next ? s.next?.deals : s.deals),
  },
  {
    name: 'pantry_offer_accept',
    description: "Accept a deal switch (by offer id) for next week's draft cart. Changes the draft only; still needs approval at checkout.",
    inputSchema: obj({ id: { type: 'string' } }, ['id']),
    mutates: true,
    run: (a, s, state) => acceptOffer(world, state, a.id),
  },
  {
    name: 'pantry_slot',
    description: 'The one-off delivery slot Pantry would book: the latest slot that still lands before the first item runs out. No subscriptions.',
    inputSchema: obj(),
    run: (_, s) => s.slot,
  },
  {
    name: 'pantry_checkout_request',
    description: 'Ask the human to approve payment for the current cart and slot. Returns a pending approval. Pantry cannot approve it; the human does, with Face ID.',
    inputSchema: obj(),
    mutates: true,
    run: (_, s, state) => requestCheckout(world, state),
  },
  {
    name: 'pantry_status',
    description: 'Latest approval (pending / approved / charged / declined) and the order it produced.',
    inputSchema: obj(),
    run: (_, s) => ({ approval: s.approval, order: s.order }),
  },
  {
    name: 'pantry_inbox',
    description: "Pantry's own inbox, triaged: what was handled quietly, drafted refund cases (each needs a human tap to file), what needs the human, and what was learned.",
    inputSchema: obj(),
    run: (_, s) => s.inbox,
  },
];

const send = msg => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function callTool(name, args = {}) {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) throw Object.assign(new Error(`Unknown tool: ${name}`), { rpc: -32602 });
  const state = loadState();
  const result = tool.mutates ? tool.run(args, null, state) : tool.run(args, snapshot(world, state), state);
  if (tool.mutates) saveState(state);
  return result;
}

createInterface({ input: process.stdin }).on('line', line => {
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
          instructions: 'Pantry plans the weekly shop. Read with pantry_predict / pantry_cart; edit the draft freely; checkout only creates an approval request. Never claim a purchase happened until pantry_status says charged.',
        });
      case 'ping':
        return reply(id, {});
      case 'tools/list':
        return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      case 'tools/call':
        try {
          const result = callTool(params.name, params.arguments);
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
