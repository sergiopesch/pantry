import { tmpState } from './setup.js';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(new URL('../src/mcp.js', import.meta.url))], { env: { ...process.env, PANTRY_STATE: tmpState(), PANTRY_EVENT_STATE: tmpState(), PANTRY_CLOCK: '2026-10-26T10:00:00+00:00' } });
const pending = new Map();
createInterface({ input: child.stdout }).on('line', line => {
  const msg = JSON.parse(line);
  pending.get(msg.id)?.(msg);
});
let next = 0;
const rpc = (method, params = {}) => new Promise(resolve => {
  const id = ++next;
  pending.set(id, resolve);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
});
const call = async (name, args = {}) => JSON.parse((await rpc('tools/call', { name, arguments: args })).result.content[0].text);
after(() => child.kill());

test('initializes and lists tools, none of which can move money', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  assert.equal(init.result.serverInfo.name, 'pantry');
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const { result } = await rpc('tools/list');
  const names = result.tools.map(t => t.name);
  assert.ok(names.includes('pantry_plan'));
  assert.ok(names.includes('pantry_checkout_request'));
  assert.ok(!names.some(n => /approve|charge|send|file/.test(n)), names.join(', '));
});

test('needs the event from Notion, then plans for who shows up, and asks for approval but cannot approve', async () => {
  const none = await rpc('tools/call', { name: 'pantry_headcount', arguments: {} });
  assert.match(none.result.content[0].text, /Read the upcoming event from Notion/);
  await call('pantry_event_set', { name: 'Grok Builders Hack Night', kind: 'hackathon', start: '2026-10-29T18:00:00+00:00', venue: { name: 'Hall', address: '1 Example Street, London EC2A 4NE', deliveriesBefore: '18:00' }, budget: { total: 1000 } });
  await call('pantry_guests_import', { file: fileURLToPath(new URL('../data/events/guests.csv', import.meta.url)) });
  const h = await call('pantry_headcount');
  assert.match(h.text, /^140 signed up\. .* Plan for 93, not 140\.$/);
  const d = await call('pantry_diets');
  assert.ok(d.needs.every(n => !('guests' in n)), 'diets are counts only');
  const approval = await call('pantry_checkout_request');
  assert.equal(approval.status, 'pending');
  const status = await call('pantry_status');
  assert.equal(status.approval.status, 'pending');
});

test('unknown tools are a protocol error', async () => {
  const r = await rpc('tools/call', { name: 'pantry_pay_now', arguments: {} });
  assert.equal(r.error.code, -32602);
});
