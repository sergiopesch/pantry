import './setup.js';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';

const { freshState } = await import('../src/data.js');
const { createPantryServer } = await import('../src/server.js');

const server = createPantryServer({ persist: false, initialState: freshState() });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (path, body = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
after(() => server.close());

test('serves the app and its assets', async () => {
  for (const path of ['/', '/app.css', '/app.js', '/art.js', '/brand.js', '/icons.js', '/brand.html']) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200, path);
  }
});

test('refuses to serve files outside web/', async () => {
  const r = await fetch(`${base}/..%2Fdata%2Fhousehold.json`);
  assert.equal(r.status, 403);
});

test('checkout then approve over HTTP', async () => {
  const snap = await (await fetch(`${base}/api/snapshot`)).json();
  assert.equal(snap.slot.window, '4–6 PM');
  const { approval } = await (await post('/api/checkout')).json();
  assert.equal(approval.status, 'pending');
  const done = await (await post('/api/approve', { id: approval.id })).json();
  assert.equal(done.approval.status, 'charged');
  assert.equal(done.snapshot.order.total, approval.amount);
  const again = await post('/api/approve', { id: approval.id });
  assert.equal(again.status, 409);
});

test('off-localhost, the API refuses calls without the pairing key', async () => {
  const paired = createPantryServer({ persist: false, initialState: freshState(), key: 'secret' });
  await new Promise(r => paired.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${paired.address().port}`;
  try {
    assert.equal((await fetch(`${url}/api/snapshot`)).status, 401);
    assert.equal((await fetch(`${url}/api/approve`, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(`${url}/api/snapshot`, { headers: { 'x-pantry-key': 'secret' } })).status, 200);
    assert.equal((await fetch(`${url}/`)).status, 200, 'the shell itself is public');
  } finally {
    paired.close();
  }
});
