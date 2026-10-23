#!/usr/bin/env node
// Pay with a single-use Agentcard in Agentcard's SANDBOX, after the organiser's explicit yes in chat.
//   AGENTCARD_CLIENT_ID=… AGENTCARD_CLIENT_SECRET=… node scripts/agentcard-pay.mjs --gbp 70 --merchant "Vanda's Kitchen" --key <approval id>
// It refuses a live (non-sandbox) credential. One run is one card, for exactly the approved amount:
//   token (client credentials) → £→$ at today's ECB rate → cardholder ready → single-use card for exactly that
//   amount → test_charge it once → the card closes. It prints what pantry_payment_confirm needs, as JSON.
// What the sandbox does (checked 23 Oct 2026): a simulated Visa authorises at most $100.00 per card, and
// re-attaching it (setup_cardholder_payment_method) resets its running limit; test_charge takes cents.
const API = process.env.AGENTCARD_API_URL ?? 'https://api.agentcard.sh';
const MCP = process.env.AGENTCARD_MCP_URL ?? 'https://mcp.agentcard.sh/mcp';
const SANDBOX_CARD_CAP_CENTS = 10000;
const CARDHOLDER = { first_name: 'Pantry', last_name: 'Organiser', date_of_birth: '1990-01-15', email: 'pantry-organiser@example.com' };

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]] : acc), []));
const fail = message => { console.log(JSON.stringify({ ok: false, error: message })); process.exit(1); };

const gbp = Math.round(Number(args.gbp) * 100) / 100;
if (!(gbp > 0)) fail('Pass --gbp: the approved amount in pounds.');
if (!args.merchant) fail('Pass --merchant: who the organiser approved paying.');
if (!args.key) fail('Pass --key: the approval id, so one approval can only ever make one card.');
const { AGENTCARD_CLIENT_ID: id, AGENTCARD_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) fail('Set AGENTCARD_CLIENT_ID and AGENTCARD_CLIENT_SECRET (the sandbox client) in the environment.');

// 1. A company token. Sandbox only.
const tokenRes = await fetch(`${API}/api/v2/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }) });
const token = await tokenRes.json().catch(() => ({}));
if (!token.access_token) fail(`Agentcard refused the client credentials (${tokenRes.status}).`);
if (token.sandbox !== true) fail('This is not a sandbox credential. Pantry only pays in Agentcard sandbox; nothing was charged.');

// 2. The organisation's MCP tools, over Streamable HTTP.
let session = null;
let seq = 0;
async function rpc(method, params) {
  const r = await fetch(MCP, { method: 'POST', headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params }) });
  session = r.headers.get('mcp-session-id') ?? session;
  const text = await r.text();
  const data = text.match(/^data: (.*)$/m)?.[1] ?? text;
  return JSON.parse(data);
}
async function tool(name, args = {}) {
  const r = await rpc('tools/call', { name, arguments: args });
  if (r.error) throw new Error(`${name}: ${r.error.message}`);
  const out = r.result?.structuredContent ?? JSON.parse(r.result?.content?.[0]?.text ?? '{}');
  if (out.status === 'error' || r.result?.isError) throw new Error(`${name}: ${out.message ?? 'failed'}`);
  return out;
}
await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pantry', version: '1' } });
await fetch(MCP, { method: 'POST', headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-session-id': session }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });

try {
  // 3. Pounds to dollars: --rate, or today's ECB reference rate.
  let rate = Number(args.rate);
  let rateSource = 'given';
  if (!(rate > 0)) {
    const fx = await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=USD').then(r => r.json()).catch(() => null);
    rate = fx?.rates?.USD;
    rateSource = fx?.date ? `ECB ${fx.date}` : null;
    if (!(rate > 0)) fail('Couldn\'t read today\'s £→$ rate. Pass --rate (US dollars per pound).');
  }
  const cents = Math.round(gbp * rate * 100);
  if (cents > SANDBOX_CARD_CAP_CENTS) fail(`£${gbp.toFixed(2)} is $${(cents / 100).toFixed(2)}. Agentcard's sandbox issues test cards up to $100.00, so nothing was charged.`);

  // 4. The organiser as a sandbox cardholder: verified, with a simulated Visa attached afresh.
  let holder = args.cardholder ?? process.env.AGENTCARD_CARDHOLDER_ID;
  if (!holder) {
    const { cardholders = [] } = await tool('list_cardholders');
    holder = cardholders.find(c => c.email === CARDHOLDER.email)?.id;
    if (!holder) holder = (await tool('create_cardholder', CARDHOLDER)).cardholderId;
  }
  const kyc = await tool('get_cardholder_kyc_status', { cardholder_id: holder });
  if (kyc.status !== 'verified') {
    const start = await tool('start_cardholder_kyc', { cardholder_id: holder });
    const link = start.message?.match(/token=([\w.-]+)/)?.[1];
    if (start.status !== 'verified' && link) await fetch(`${API}/kyc/verify/test-complete`, { method: 'POST', headers: { authorization: `Bearer ${link}`, 'content-type': 'application/json' }, body: JSON.stringify({ outcome: 'approved' }) });
    if ((await tool('get_cardholder_kyc_status', { cardholder_id: holder })).status !== 'verified') fail('The sandbox cardholder isn\'t verified yet; nothing was charged.');
  }
  await tool('setup_cardholder_payment_method', { cardholder_id: holder });

  // 5. One single-use card for exactly the amount, charged once, then closed.
  const made = await tool('create_card', { cardholder_id: holder, amount_cents: cents, type: 'single_use', idempotency_key: String(args.key) });
  const descriptor = String(args.merchant).toUpperCase().replace(/[^A-Z0-9 &]/g, '').replace(/\s+/g, ' ').trim().slice(0, 22);
  const charge = await tool('test_charge', { card_id: made.cardId, amount: cents, merchant: descriptor });
  const { card } = await tool('get_card', { card_id: made.cardId });
  console.log(JSON.stringify({
    ok: charge.cardStatus === 'CLOSED' || card?.status === 'CLOSED',
    sandbox: true,
    gbp, usd: cents / 100, rate: Math.round(rate * 10000) / 10000, rateSource,
    merchant: args.merchant, descriptor,
    card: `Visa •••• ${made.last4 ?? card?.last4}`, cardId: made.cardId,
    transaction: charge.paymentId, status: 'cleared', cardStatus: card?.status ?? charge.cardStatus, events: charge.events,
    confirm: { approvalId: String(args.key), amount: gbp, status: 'cleared', processor: 'agentcard', card: `Visa •••• ${made.last4 ?? card?.last4}`, reference: charge.paymentId, sandbox: true, usd: cents / 100, rate: Math.round(rate * 10000) / 10000 },
  }, null, 2));
} catch (e) {
  fail(`${e.message}. Nothing more was charged.`);
}
