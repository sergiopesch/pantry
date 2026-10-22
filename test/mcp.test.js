import { tmpState } from './setup.js';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(new URL('../src/mcp.js', import.meta.url))], { env: { ...process.env, PANTRY_STATE: tmpState() } });
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
  assert.ok(names.includes('pantry_predict'));
  assert.ok(names.includes('pantry_checkout_request'));
  assert.ok(!names.some(n => /approve|charge|file/.test(n)), names.join(', '));
});

test('predicts and asks for approval, but cannot approve', async () => {
  const p = await call('pantry_predict');
  assert.match(p.nudge, /^Eggs run out Thursday night/);
  const approval = await call('pantry_checkout_request');
  assert.equal(approval.status, 'pending');
  const status = await call('pantry_status');
  assert.equal(status.approval.status, 'pending');
});

test('unknown tools are a protocol error', async () => {
  const r = await rpc('tools/call', { name: 'pantry_pay_now', arguments: {} });
  assert.equal(r.error.code, -32602);
});
