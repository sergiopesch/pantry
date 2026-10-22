# Posting a Pantry card as an image

Pantry has no Visualize tool here. It renders the card in headless Chrome and posts the screenshot as an image.

1. Get the card: `pantry_card {kind, ...}` returns `{ title, html, alt }`.
2. Save `html` as a file on its own (no wrapper). The fragment resets `html` and `body` to margin 0 with a transparent background, and its only element is `#pantry-card`, 600 px wide.
3. In headless Chrome (Playwright or Puppeteer):
   - viewport **600 × 800**, `deviceScaleFactor: 2`
   - open the file, then **wait 1500 ms**, so the entrance animation reaches its final frame (it ends by about 1.2 s)
   - screenshot the **element** `#pantry-card` with **`omitBackground: true`**, so the 16 px rounded corners stay transparent
4. Post **only the PNG**, with your one-sentence answer as the text. Use `alt` as the image description. If rendering fails, send the text answer alone.

Playwright, for reference:
```js
const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForTimeout(1500);
await (await page.$('#pantry-card')).screenshot({ path: 'card.png', omitBackground: true });
```
To capture the final state without waiting, add `reducedMotion: 'reduce'` to the page options. It renders the same final frame immediately.
