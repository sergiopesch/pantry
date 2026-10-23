// render.mjs <url> <out.mp4> <seconds> [w] [h] [dsf] [--keys=t:Key,…] [--at=t1,t2,…]: frame-exact capture at 60 fps.
// JS timers run on Playwright's paused clock, and every CSS animation and transition is paused and seeked,
// so frame n shows the page at exactly n/60 s however long a screenshot takes. A dsf above 1 supersamples.
// --keys presses keys at those times (the deck's own controls). With --at, it writes stills at those times
// (<out>-<t>.png) instead of a video.
// PLAYWRIGHT_CORE: path to playwright-core's index.mjs (or install playwright-core); CHROME: a Chromium headless shell.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { spawn } from 'node:child_process';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const at = process.argv.find(a => a.startsWith('--at='))?.slice(5).split(',').map(Number);
const keys = new Map();
for (const k of process.argv.find(a => a.startsWith('--keys='))?.slice(7).split(',') ?? []) {
  const [t, key] = k.split(':'); const f = Math.round(+t * 60);
  keys.set(f, [...(keys.get(f) ?? []), key]);
}
const [url, out, secs, w = '1920', h = '1080', dsf = '1'] = args;
const FPS = 60, N = Math.round(+secs * FPS);

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const context = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf });
const page = await context.newPage();
const T0 = Date.parse('2026-10-23T12:00:00Z');
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0 + 1000);
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

// Animations are timed from the frame they first appear in: at load for the explainers, at each cue for the deck.
let now = 0;
async function seek(f) {
  const ms = Math.round(f * 1000 / FPS);
  if (ms > now) { await page.clock.runFor(ms - now); now = ms; }
  for (const key of keys.get(f) ?? []) await page.keyboard.press(key);
  await page.evaluate(t => {
    const born = (window.__born ??= new WeakMap());
    for (const a of document.getAnimations()) {
      if (!born.has(a)) { born.set(a, t); a.pause(); }
      a.currentTime = Math.max(0, t - born.get(a));
    }
  }, ms);
}

if (at) {
  // Step through every frame anyway, so animations started by timers are born on the right frame.
  const want = new Map(at.map(t => [Math.round(t * FPS), t]));
  for (let f = 0; f <= Math.max(...want.keys()); f++) {
    await seek(f);
    if (want.has(f)) await page.screenshot({ path: `${out}-${want.get(f)}.png` });
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-r', String(FPS), out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    await seek(f);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) process.stderr.write(`\r${out}: ${f}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  process.stderr.write(`\r${out}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
}
await browser.close();
