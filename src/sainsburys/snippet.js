#!/usr/bin/env node
// Prints a DevTools console snippet. Paste it on a Sainsbury's search page in YOUR normal browser:
// it collects product tiles across searches (localStorage) and copies the JSON to your clipboard.
// Then: pbpaste > captured.json && node src/cli.js catalog import captured.json
import { extractProducts } from './extract.js';

console.log(`(() => {
  const extractProducts = ${extractProducts.toString()};
  const key = 'pantry-capture';
  const all = Object.fromEntries(JSON.parse(localStorage.getItem(key) || '[]').map(p => [p.url, p]));
  for (const p of extractProducts(document)) all[p.url] = p;
  const list = Object.values(all);
  localStorage.setItem(key, JSON.stringify(list));
  copy(JSON.stringify(list, null, 1));
  console.log('Pantry: ' + list.length + ' products captured so far (copied to clipboard). With images: ' + list.filter(p => p.image).length);
})();`);
