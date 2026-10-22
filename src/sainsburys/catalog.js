// Merges products captured from the live site into data/catalog.json: real names, prices, Nectar prices,
// product URLs and CDN image URLs. Matches by product URL first, then by name tokens and pack size.
const STOP = new Set(["sainsbury's", 'sainsburys', 'the', 'and', 'of', 'with', 'by']);
const tokens = s => String(s).toLowerCase().replace(/[(),]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t));
const sizeTokens = s => tokens(s).filter(t => /^(x\d+|\d+(\.\d+)?(g|kg|ml|l|ltr)|\d+x\d+g?|\d+pt|pints?)$/.test(t));

function similarity(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  const inter = [...A].filter(t => B.has(t)).length;
  return inter / (A.size + B.size - inter || 1);
}

function sizesAgree(a, b) {
  const [x, y] = [sizeTokens(a), sizeTokens(b)];
  return !x.length || !y.length || x.some(t => y.includes(t));
}

export function importCaptured(catalog, captured, { now = new Date() } = {}) {
  const pool = [...captured];
  const matched = [];
  const products = catalog.products.map(p => {
    let idx = p.url ? pool.findIndex(c => c.url === p.url) : -1;
    if (idx < 0) {
      let best = -1;
      let score = 0.45;
      pool.forEach((c, i) => {
        const s = similarity(p.name, c.name);
        if (s > score && sizesAgree(p.name, c.name)) { best = i; score = s; }
      });
      idx = best;
    }
    if (idx < 0) return p;
    const c = pool.splice(idx, 1)[0];
    matched.push({ sku: p.sku, name: c.name, image: Boolean(c.image) });
    const renamed = c.name && c.name !== p.name;
    return {
      ...p,
      name: c.name || p.name,
      aliases: renamed ? [...new Set([...(p.aliases ?? []), p.name])] : p.aliases,
      price: c.price ?? p.price,
      nectarPrice: c.nectarPrice ?? undefined,
      url: c.url ?? p.url,
      image: c.image ?? p.image,
      source: 'live',
      capturedAt: c.capturedAt ?? now.toISOString(),
    };
  });
  const { bySku, get, family, byName, ...doc } = catalog;
  return { doc: { ...doc, capturedAt: now.toISOString(), products }, matched, unmatched: pool.map(c => c.name) };
}
