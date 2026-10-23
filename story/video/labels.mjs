// PLAYWRIGHT_CORE: path to playwright-core's index.mjs (or install playwright-core); CHROME: a Chromium headless shell.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 1 });
const work = process.env.PANTRY_VIDEO_WORK ?? '/tmp/pantry-video';
(await import('node:fs')).mkdirSync(`${work}/labels`, { recursive: true });
await page.goto(new URL('labels.html', import.meta.url).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
for (const id of ['live', 'fast']) await (await page.$(`#${id}`)).screenshot({ path: `${work}/labels/${id}.png`, omitBackground: true });
await browser.close();
