import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { indexCatalog, readJson } = await import('../src/data.js');
const { importCaptured } = await import('../src/sainsburys/catalog.js');

test('captured products merge by URL first, then by name and pack size', () => {
  const catalog = indexCatalog(readJson('catalog.json'));
  const captured = [
    { name: "Sainsbury's British Free Range Eggs Large x12", url: 'https://www.sainsburys.co.uk/groceries/product/sainsburys-british-free-range-eggs-large-x12', image: 'https://cdn.example/eggs12.jpg', price: 3.35, nectarPrice: 3.0 },
    { name: "Sainsbury's British Whole Milk 2.27L", url: 'https://www.sainsburys.co.uk/groceries/product/whole-milk-227', image: 'https://cdn.example/milk.jpg', price: 1.7 },
    { name: 'Something Else Entirely 99g', url: 'https://www.sainsburys.co.uk/groceries/product/x', image: null, price: 1 },
  ];
  const { doc, matched, unmatched } = importCaptured(catalog, captured);
  const bySku = Object.fromEntries(doc.products.map(p => [p.sku, p]));
  assert.equal(bySku['eggs-large-12'].image, 'https://cdn.example/eggs12.jpg');
  assert.equal(bySku['eggs-large-12'].nectarPrice, 3.0);
  assert.equal(bySku['milk-whole-4pt'].image, 'https://cdn.example/milk.jpg');
  assert.ok(bySku['milk-whole-4pt'].aliases.includes("Sainsbury's British Whole Milk 2.27L (4 pints)"));
  assert.equal(bySku['milk-whole-2pt'].image, null, 'the 2-pint bottle is a different pack size');
  assert.equal(matched.length, 2);
  assert.deepEqual(unmatched, ['Something Else Entirely 99g']);
});
