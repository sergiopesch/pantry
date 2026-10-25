import './setup.js';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';

const requestStatus = (url, { body, ...options }) => new Promise((resolve, reject) => {
  const req = request(url, options, response => {
    response.resume();
    response.once('end', () => resolve(response.statusCode));
  });
  req.once('error', reject);
  req.end(body);
});

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

test('browser requests cannot cross the local approval boundary', async () => {
  const isolated = createPantryServer({ persist: false, initialState: freshState() });
  await new Promise(r => isolated.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${isolated.address().port}`;
  try {
    for (const headers of [
      { origin: 'https://hostile.example', 'content-type': 'text/plain' },
      { 'sec-fetch-site': 'cross-site' },
      { host: `rebound.example:${isolated.address().port}` },
    ]) {
      const status = await requestStatus(`${url}/api/checkout`, { method: 'POST', headers, body: '{}' });
      assert.equal(status, 403);
    }
    const response = await fetch(`${url}/api/checkout`, {
      method: 'POST', headers: { origin: url, 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).approval.status, 'pending');
  } finally {
    isolated.close();
  }
});

test('paired LAN requests retain same-origin browser access', async () => {
  const paired = createPantryServer({ persist: false, initialState: freshState(), key: 'secret' });
  await new Promise(r => paired.listen(0, '127.0.0.1', r));
  const port = paired.address().port;
  try {
    const status = await requestStatus(`http://127.0.0.1:${port}/api/checkout`, {
      method: 'POST',
      headers: { host: `192.168.1.10:${port}`, origin: `http://192.168.1.10:${port}`, 'x-pantry-key': 'secret' },
      body: '{}',
    });
    assert.equal(status, 200);
  } finally {
    paired.close();
  }
});

test('malformed URI encoding returns 400 and leaves the process serving', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { createPantryServer } from ${JSON.stringify(new URL('../src/server.js', import.meta.url).href)};
    import { freshState } from ${JSON.stringify(new URL('../src/data.js', import.meta.url).href)};
    const server = createPantryServer({ persist: false, initialState: freshState() });
    server.listen(0, '127.0.0.1', () => console.log(server.address().port));
  `], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const [data] = await once(child.stdout, 'data');
    const url = `http://127.0.0.1:${Number(data.toString().trim())}`;
    for (const path of ['/%', '/%E0%A4%A']) {
      assert.equal((await fetch(url + path)).status, 400);
      assert.equal((await fetch(url + '/')).status, 200);
      assert.equal(child.exitCode, null);
    }
  } finally {
    child.kill();
    await once(child, 'exit');
  }
});
