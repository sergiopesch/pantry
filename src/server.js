#!/usr/bin/env node
// The counter: a local demo surface for the room, plus the JSON API it runs on.
// Binds to 127.0.0.1 by default. The approve endpoint stands in for Face ID, so it must never be
// reachable from the venue Wi-Fi.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshState, loadState, loadWorld, saveState } from './data.js';
import { acceptOffer, approveCheckout, declineCheckout, editCart, fileCase, keepCase, requestCheckout, setClock, snapshot } from './pantry.js';
import { act, say } from './chat.js';

const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Off-localhost, every API call must carry the pairing key (the approve endpoint stands in for Face ID).
export function createPantryServer({ world = loadWorld(), persist = true, initialState, key = null } = {}) {
  // The state file is the source of truth: the bot's CLI and MCP tools write to it from other processes.
  let state = initialState ?? loadState();
  const reload = () => { if (persist) state = loadState(); };
  const save = () => persist && saveState(state);
  const withSnap = extra => ({ ...extra, snapshot: snapshot(world, state) });

  const routes = {
    'GET /api/snapshot': () => snapshot(world, state),
    'POST /api/cart/edit': b => {
      editCart(state, b.key, b.action, b.sku, b.qty);
      save();
      return withSnap({});
    },
    'POST /api/checkout': () => {
      const approval = requestCheckout(world, state);
      save();
      return withSnap({ approval });
    },
    'POST /api/approve': b => {
      const result = approveCheckout(world, state, b.id);
      save();
      return withSnap(result);
    },
    'POST /api/decline': b => {
      const approval = declineCheckout(state, b.id);
      save();
      return withSnap({ approval });
    },
    'POST /api/offers/accept': b => {
      const result = acceptOffer(world, state, b.id);
      save();
      return withSnap(result);
    },
    'POST /api/cases/file': b => {
      const result = fileCase(world, state, b.id);
      save();
      return withSnap({ case: result });
    },
    'POST /api/cases/keep': b => {
      const result = keepCase(world, state, b.id);
      save();
      return withSnap({ case: result });
    },
    'POST /api/chat': b => {
      const r = say(world, state, b.text ?? '');
      save();
      return withSnap(r);
    },
    'POST /api/chat/act': b => {
      const message = act(world, state, b.action ?? {});
      save();
      return withSnap({ message });
    },
    'POST /api/clock': b => {
      setClock(state, b.at);
      save();
      return withSnap({});
    },
    'POST /api/reset': () => {
      state = freshState();
      save();
      return withSnap({});
    },
  };

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };

    const route = routes[`${req.method} ${url.pathname}`];
    if (route && key && req.headers['x-pantry-key'] !== key) return send(401, { error: 'Pair this device: open the link the server printed.', code: 'UNPAIRED' });
    if (route) {
      try {
        reload();
        send(200, await route(req.method === 'POST' ? await readBody(req) : {}));
      } catch (err) {
        send(err.code ? 409 : 400, { error: err.message, code: err.code ?? null });
      }
      return;
    }

    if (req.method !== 'GET') return send(404, { error: 'Not found' });
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = normalize(join(WEB, rel));
    if (!file.startsWith(WEB.endsWith(sep) ? WEB : WEB + sep)) return send(403, { error: 'Forbidden' });
    try {
      send(200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream');
    } catch {
      send(404, { error: 'Not found' });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const port = Number(process.env.PORT ?? 4217);
  const host = process.env.HOST ?? '127.0.0.1';
  const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
  const key = local ? null : process.env.PANTRY_KEY ?? randomBytes(6).toString('hex');
  createPantryServer({ key }).listen(port, host, () => {
    console.log(`Pantry on http://${local ? host : 'localhost'}:${port}`);
    if (!local) {
      const lan = Object.values(networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal)?.address;
      console.log(`On your phone (same Wi-Fi): http://${lan ?? '<this-mac-ip>'}:${port}/?key=${key}`);
      console.log('Every API call needs that key. Anyone without it gets the shell, not your cart or the approve button.');
    }
    console.log('Keys: 0–9 beats · → next · A auto-run · N captions · H hide presenter · F full screen · Shift+R reset');
  });
}
