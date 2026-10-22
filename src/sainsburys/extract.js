// Runs inside a real browser tab on a Sainsbury's search results or product page (the bot's own browser,
// or your browser via `npm run snippet`). Read-only: it reads tiles, never clicks, never touches the basket.
// Returns name, product URL, CDN image URL, price, Nectar price and unit price for every product tile.
// Written against the tile structure seen on 22 Oct 2026; if Sainsbury's redesigns, re-check before trusting it.
export function extractProducts(doc = document) {
  const origin = doc.location?.origin ?? 'https://www.sainsburys.co.uk';
  const seen = new Map();
  for (const a of doc.querySelectorAll('a[href*="/groceries/product/"], a[href*="/gol-ui/product/"]')) {
    const url = new URL(a.getAttribute('href'), origin).href.split('?')[0];
    if (seen.has(url)) continue;
    let tile = a;
    for (let i = 0; i < 8 && tile.parentElement; i++) {
      tile = tile.parentElement;
      if (/£\d/.test(tile.textContent) && tile.querySelector('img')) break;
    }
    const name = (a.textContent || a.getAttribute('aria-label') || '').replace(/^(Sponsored|Featured|Nectar Price),\s*/i, '').trim();
    if (!name) continue;
    const img = [...tile.querySelectorAll('img')].find(i => !/rating|star|badge|logo|icon/i.test(`${i.alt} ${i.src}`));
    const src = img ? img.currentSrc || img.src || img.getAttribute('data-src') : null;
    const texts = [];
    const walker = doc.createTreeWalker(tile, 4 /* NodeFilter.SHOW_TEXT */);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t) texts.push(t);
    }
    const prices = texts.filter(t => /^£\d+\.\d{2}$/.test(t)).map(t => Number(t.slice(1)));
    const nectar = /nectar price/i.test(tile.textContent) && prices.length > 1;
    seen.set(url, {
      name,
      url,
      image: src && !src.startsWith('data:') ? src : null,
      price: nectar ? prices[1] : prices[0] ?? null,
      nectarPrice: nectar ? prices[0] : null,
      unitPrice: texts.find(t => /^(£\d+\.\d{2}|\d+p)\s*\/\s*\w+/.test(t)) ?? null,
      capturedAt: new Date().toISOString(),
    });
  }
  return [...seen.values()];
}
