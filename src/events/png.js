// Cards as PNGs, for chats with no live HTML (Grok Bot here has no Visualize tool). One headless Chrome,
// driven over the DevTools protocol with a small WebSocket client, so there are still no dependencies.
// Each card is opened with reduced motion (its final frame at once) at 2x, and only #pantry-card is
// captured, on a transparent background, so the rounded corners stay round.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const WIDTH = 600;
const SCALE = 2;

// Chrome, Chromium or Playwright's headless shell, wherever this computer keeps one. PANTRY_CHROME wins.
export function findChrome() {
  const caches = [join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright')];
  const fromCache = caches.filter(existsSync).flatMap(c => readdirSync(c).sort().reverse().flatMap(d => [
    join(c, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'), join(c, d, 'chrome-headless-shell-mac-x64/chrome-headless-shell'),
    join(c, d, 'chrome-headless-shell-linux64/chrome-headless-shell'), join(c, d, 'chrome-linux/headless_shell'), join(c, d, 'chrome-linux/chrome'),
    join(c, d, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
  ]));
  const onPath = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'headless_shell', 'chrome-headless-shell']
    .flatMap(b => (process.env.PATH ?? '').split(delimiter).map(d => join(d, b)));
  const candidates = [process.env.PANTRY_CHROME, process.env.CHROME_PATH, ...fromCache, ...onPath,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/snap/bin/chromium'];
  const found = candidates.find(p => p && existsSync(p));
  if (!found) throw new Error('No Chrome found for card PNGs. Set PANTRY_CHROME to a Chrome, Chromium or chrome-headless-shell binary.');
  return found;
}

// --- A minimal WebSocket client (RFC 6455), enough for the DevTools protocol ------------------------------

function connect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = request({ host: u.hostname, port: u.port, path: u.pathname, headers: {
      Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
    } });
    req.on('error', reject);
    req.on('response', r => reject(new Error(`DevTools refused the WebSocket (${r.statusCode}).`)));
    req.on('upgrade', (_, socket) => {
      let buf = Buffer.alloc(0);
      let parts = [];
      const listeners = new Set();
      socket.on('data', chunk => {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
          if (buf.length < 2) return;
          const fin = buf[0] & 0x80, op = buf[0] & 0x0f;
          let len = buf[1] & 0x7f, at = 2;
          if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
          else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); at = 10; }
          if (buf.length < at + len) return;
          const payload = buf.subarray(at, at + len);
          buf = buf.subarray(at + len);
          if (op === 0x9) send(payload, 0xa);
          else if (op === 0x8) socket.end();
          else if (op === 0x1 || op === 0x0) {
            parts.push(payload);
            if (fin) { const text = Buffer.concat(parts).toString('utf8'); parts = []; for (const l of listeners) l(text); }
          }
        }
      });
      const send = (data, op = 0x1) => {
        const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const mask = randomBytes(4);
        const head = body.length < 126 ? Buffer.from([0x80 | op, 0x80 | body.length])
          : body.length < 65536 ? Buffer.from([0x80 | op, 0x80 | 126, body.length >> 8, body.length & 255])
          : Buffer.concat([Buffer.from([0x80 | op, 0x80 | 127]), (b => (b.writeBigUInt64BE(BigInt(body.length)), b))(Buffer.alloc(8))]);
        const masked = Buffer.alloc(body.length);
        for (let i = 0; i < body.length; i++) masked[i] = body[i] ^ mask[i & 3];
        socket.write(Buffer.concat([head, mask, masked]));
      };
      resolve({ send: text => send(text), onMessage: f => listeners.add(f), close: () => socket.destroy() });
    });
    req.end();
  });
}

// --- Chrome over the DevTools protocol ---------------------------------------------------------------

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'pantry-chrome-'));
  const bin = findChrome();
  const shell = /headless[_-]shell/.test(bin);
  const child = spawn(bin, [
    ...(shell ? [] : ['--headless=new']), '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--disable-gpu', '--mute-audio', ...(process.platform === 'linux' ? ['--no-sandbox'] : []), 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d; });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await new Promise(r => setTimeout(r, 100));
  if (!existsSync(portFile)) { child.kill(); throw new Error(`Chrome didn't start for card PNGs. ${stderr.trim().split('\n').slice(-2).join(' ')}`); }
  const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = await connect(`ws://127.0.0.1:${port}${path}`);
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onMessage(text => {
    const m = JSON.parse(text);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method) for (const w of [...waiters]) if (w.method === m.method && (!w.sessionId || w.sessionId === m.sessionId)) { waiters.splice(waiters.indexOf(w), 1); w.res(m.params); }
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
  const once = (method, sessionId, ms = 10000) => new Promise((res, rej) => { const w = { method, sessionId, res }; waiters.push(w); setTimeout(() => rej(new Error(`Timed out waiting for ${method}.`)), ms).unref(); });
  const close = () => { try { ws.close(); } catch {} child.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 300); };
  return { send, once, close };
}

// Render one or more cards ({ html, name }) to PNG files in dir. Returns their paths.
export async function renderCards(cards, dir = process.env.PANTRY_CARD_DIR ?? join(tmpdir(), 'pantry-cards')) {
  mkdirSync(dir, { recursive: true });
  const chrome = await launch();
  try {
    const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => chrome.send(m, p, sessionId);
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 800, deviceScaleFactor: SCALE, mobile: false });
    await s('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] });
    await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    const out = [];
    for (const c of cards) {
      const file = join(dir, `${c.name}.html`);
      writeFileSync(file, `<!doctype html><meta charset="utf-8">${c.html}`);
      const loaded = chrome.once('Page.loadEventFired', sessionId);
      await s('Page.navigate', { url: `file://${file}` });
      await loaded;
      const { result } = await s('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { const b = document.querySelector('#pantry-card').getBoundingClientRect(); r({ x: b.x, y: b.y, w: b.width, h: b.height }); }))))` });
      const box = result.value;
      if (box.h > 800) await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: Math.ceil(box.h), deviceScaleFactor: SCALE, mobile: false });
      const shot = await s('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
      if (box.h > 800) await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 800, deviceScaleFactor: SCALE, mobile: false });
      const png = join(dir, `${c.name}.png`);
      writeFileSync(png, Buffer.from(shot.data, 'base64'));
      rmSync(file, { force: true });
      out.push(png);
    }
    return out;
  } finally {
    chrome.close();
  }
}
