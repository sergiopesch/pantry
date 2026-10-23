#!/usr/bin/env node
// Pantry stage server: one deck window, one Grok Bot window, every Stream Deck key a silent GET.
//   node story/streamdeck/stage.js        then the Stream Deck keys hit http://127.0.0.1:4321/key/<name>
// The deck page is served from here and listens on /events, so a key press changes it in place: no reload,
// no new window, no app launch. Grok Bot is sized to whichever screen it's on through the accessibility API
// (bin/grok), which needs this process to be started from a terminal that already has Accessibility access.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4321;
const DIR = fileURLToPath(new URL('.', import.meta.url));
const STORY = join(DIR, '..');
const PANTRY_CHAT = 'grokbot://app/v1/agent?id=5ab715a0-38f1-42bb-b342-f792ecd90270';
const PROFILE = `${process.env.HOME}/Library/Application Support/PantryStageChrome`;

const clients = new Set();
let deckPid = null;

const log = (...a) => console.log(new Date().toTimeString().slice(0, 8), ...a);
const run = (cmd, args) => new Promise(res => execFile(cmd, args, { timeout: 15000 }, (err, out) => res(err ? '' : String(out).trim())));
const osa = script => run('osascript', ['-e', script]);
let current = 'idle';
const broadcast = mode => { current = mode; seq++; for (const c of clients) c.write(`data: ${mode}\n\n`); };
let seq = 0;

// The deck window: a Chrome app window in its own profile, launched once.
async function ensureDeck() {
  if (deckPid && (await run('ps', ['-p', String(deckPid), '-o', 'pid='])) ) return;
  const pids = (await run('pgrep', ['-f', `user-data-dir=${PROFILE}`])).split('\n').filter(Boolean);
  if (pids.length) { deckPid = Number(pids[0]); return; }
  spawn('open', ['-na', 'Google Chrome', '--args', `--user-data-dir=${PROFILE}`, '--kiosk', `http://127.0.0.1:${PORT}/#${current}`,
    '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble', '--hide-crash-restore-bubble',
    '--autoplay-policy=no-user-gesture-required'], { detached: true, stdio: 'ignore' });
  for (let i = 0; i < 40 && !deckPid; i++) {
    await new Promise(r => setTimeout(r, 150));
    const p = (await run('pgrep', ['-f', `user-data-dir=${PROFILE}`])).split('\n').filter(Boolean);
    if (p.length) deckPid = Number(p[0]);
  }
  await new Promise(r => setTimeout(r, 1200));
}

const deckProc = () => `(first process whose unix id is ${deckPid})`;

async function deckFront() {
  await ensureDeck();
  await osa(`tell application "System Events" to set frontmost of (first process whose unix id is ${deckPid}) to true`);
}

const GROK = join(DIR, 'bin', 'grok');
async function grokFull() {
  await osa('tell application "Grok Bot" to activate');
  await run(GROK, ['fill']);
  await run(GROK, ['pantry']);
}

const KEYS = {
  scene: async () => { broadcast('scene'); await deckFront(); },
  pantry: async () => { broadcast('pantry'); await deckFront(); },
  wrap: async () => { broadcast('wrap'); await deckFront(); },
  idle: async () => { broadcast('idle'); await deckFront(); },
  connect: async () => { broadcast('connect'); await deckFront(); },
  tools: async () => { broadcast('tools'); await deckFront(); },
  agentcard: async () => { broadcast('agentcard'); await deckFront(); },
  grok: async () => { await run('open', [PANTRY_CHAT]); await grokFull(); },
  grokfull: grokFull,
  next: () => run('/bin/zsh', [join(DIR, 'prompt.sh'), 'next']),
  send: () => run('/bin/zsh', [join(DIR, 'prompt.sh'), 'send']),
  promptreset: () => run('/bin/zsh', [join(DIR, 'prompt.sh'), 'reset']),
};

// The show: one Next key walks the whole run, one moment per press.
const prompt = (...a) => run('/bin/zsh', [join(DIR, 'prompt.sh'), ...a]);
const SHOW = [
  ['Set the scene (20 s)', () => KEYS.scene()],
  ['Introduce Pantry (10 s)', () => KEYS.pantry()],
  ['Grok Bot, first question appears', async () => { await KEYS.grok(); await prompt('type', '1'); }],
  ['Send it; connections on the left', async () => { await prompt('send'); await new Promise(r => setTimeout(r, 1500)); await KEYS.connect(); }],
  ['Grok Bot, one level deeper appears', async () => { await grokFull(); await prompt('type', '2'); }],
  ['Send it', () => prompt('send')],
  ['Contact the provider appears', async () => { await grokFull(); await prompt('type', '3'); }],
  ['Send it; how Pantry works on the left', async () => { await prompt('send'); await new Promise(r => setTimeout(r, 1500)); await KEYS.tools(); }],
  ['Provider replied, pay appears', async () => { await grokFull(); await prompt('type', '4'); }],
  ['Send it; Agentcard on the left', async () => { await prompt('send'); await new Promise(r => setTimeout(r, 1500)); await KEYS.agentcard(); }],
  ['Wrap and thank you', () => KEYS.wrap()],
];
let step = 0;
Object.assign(KEYS, {
  shownext: async () => { if (step >= SHOW.length) return log('show: at the end'); const [label, act] = SHOW[step++]; log(`show ${step}/${SHOW.length}: ${label}`); await act(); },
  showback: async () => { step = Math.max(0, step - 2); await KEYS.shownext(); },
  showstart: async () => { step = 0; await prompt('reset'); log('show: start'); await KEYS.shownext(); },
  showreset: async () => { step = 0; await prompt('reset'); await KEYS.idle(); log('show: reset'); },
});

// Injected into the deck when it's served from here: follow the keys without reloading.
const LISTEN = `<script>(function(){var last=-1;function go(m){if(location.hash.slice(1)===m){dispatchEvent(new HashChangeEvent('hashchange'))}else{location.hash=m}}
function poll(){fetch('/state',{cache:'no-store'}).then(function(r){return r.json()}).then(function(s){if(last<0){last=s.seq;return}if(s.seq!==last){last=s.seq;go(s.mode)}}).catch(function(){})}
setInterval(poll,400);poll()})();</script>`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

let busy = Promise.resolve();
createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/state') return res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ mode: current, seq }));
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(': hello\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  const key = url.pathname.match(/^\/key\/([a-z]+)$/)?.[1];
  if (key) {
    if (!KEYS[key]) return res.writeHead(404).end('no such key');
    res.writeHead(204).end(); // answer the Stream Deck at once; do the work in order
    log('key', key);
    busy = busy.then(() => KEYS[key]()).catch(e => log('error', key, e.message));
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = normalize(join(STORY, rel));
  if (!file.startsWith(STORY)) return res.writeHead(403).end();
  try {
    let body = await readFile(file);
    if (file.endsWith('index.html')) body = Buffer.from(String(body).replace('</body>', `${LISTEN}</body>`));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, '127.0.0.1', () => log(`Pantry stage on http://127.0.0.1:${PORT}  keys: ${Object.keys(KEYS).join(', ')}`));
