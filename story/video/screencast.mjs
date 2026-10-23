// screencast.mjs <url> <out-dir> <seconds> <w> <h> <dsf>: headless Chrome screencast to PNG frames with timestamps.
// PLAYWRIGHT_CORE: path to playwright-core's index.mjs (or install playwright-core); CHROME: a Chromium headless shell.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { mkdirSync, writeFileSync } from 'node:fs';
const [url, dir, secs = '5', w = '1920', h = '1080', dsf = '1'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const exe = process.env.CHROME;
const browser = await chromium.launch({ executablePath: exe, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dsf });
const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async f => {
  frames.push({ t: f.metadata.timestamp, data: f.data });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await page.goto('about:blank');
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: +w * +dsf, maxHeight: +h * +dsf });
const t0 = Date.now() / 1000;
await page.goto(url);
await page.waitForTimeout(+secs * 1000);
await cdp.send('Page.stopScreencast');
await browser.close();
let list = '';
frames.forEach((f, i) => { writeFileSync(`${dir}/f${String(i).padStart(5, '0')}.png`, Buffer.from(f.data, 'base64')); });
for (let i = 0; i < frames.length; i++) {
  const dur = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / 30;
  list += `file 'f${String(i).padStart(5, '0')}.png'\nduration ${dur.toFixed(5)}\n`;
}
list += `file 'f${String(frames.length - 1).padStart(5, '0')}.png'\n`;
writeFileSync(`${dir}/frames.txt`, list);
const span = frames.length > 1 ? frames.at(-1).t - frames[0].t : 0;
console.log(`${frames.length} frames over ${span.toFixed(2)} s = ${(frames.length / span).toFixed(1)} fps; first frame at +${(frames[0]?.t - t0).toFixed(2)} s`);
