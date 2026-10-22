#!/usr/bin/env node
// Writes data/history.json: nine Monday main shops and eight midweek top-ups, 24 Aug – 19 Oct 2026.
// Deterministic on purpose so tests and the demo always tell the same story:
//   - a dozen eggs every Monday, another dozen by Thursday/Friday → ~24 a week → Monday's dozen is gone by Friday
//   - processed food creeps in with a Saturday top-up on 3 October and stays in every shop after it
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../data/history.json', import.meta.url));

const MAINS = ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];
const TOP_UPS = [
  ['2026-08-27', '19:00'], ['2026-09-04', '09:00'], ['2026-09-10', '19:00'], ['2026-09-18', '09:00'],
  ['2026-09-24', '19:00'], ['2026-10-03', '10:00'], ['2026-10-09', '09:00'], ['2026-10-15', '19:00'],
];

// Processed food that crept in, keyed by shop date. Nothing like this before 3 October except one box of fish fingers.
const CREEP = {
  '2026-09-10': ['fish-fingers-10'],
  '2026-10-03': ['pizza-pepperoni', 'crisps-multipack-12', 'nuggets-450'],
  '2026-10-05': ['pizza-pepperoni', 'brioche-rolls-6', 'digestives-choc'],
  '2026-10-09': ['nuggets-450', 'lasagne-400', 'crisps-multipack-12'],
  '2026-10-12': ['pizza-pepperoni', 'pizza-pepperoni', 'crisps-multipack-12', 'digestives-choc'],
  '2026-10-15': ['pizza-pepperoni', 'lasagne-400'],
  '2026-10-19': ['pizza-pepperoni', 'crisps-multipack-12', 'brioche-rolls-6', 'nuggets-450'],
};

function mainBasket(week) {
  const lines = [
    ['eggs-large-12', 1], ['milk-whole-4pt', 1], ['bananas-5', 1], ['strawberries-400', 1],
    ['blueberries-150', week === 3 ? 1 : 2], ['apples-gala-6', 1], ['avocados-2', 1],
    ['broccoli', [1, 4, 7].includes(week) ? 2 : 1], ['spinach-240', 1], ['sweet-potatoes-1kg', 1],
    ['baby-potatoes-1kg', 1], ['chicken-thighs-1kg', 1], ['beef-mince-500', 1], ['salmon-2', 1],
    ['yoghurt-whole-500', 1], ['bread-wholemeal-800', 1],
  ];
  if (week % 2 === 0) lines.push(['cheddar-mild-400', 1], ['pasta-fusilli-500', 1]);
  if (week % 2 === 1) lines.push(['coffee-beans-227', 1], ['carrots-1kg', 1], ['chillies-red', 1]);
  if (week % 3 === 0) lines.push(['rice-basmati-1kg', 1]);
  if (week % 4 === 0) lines.push(['olive-oil-1l', 1]);
  return lines;
}

function topUpBasket(week) {
  const lines = [['eggs-large-12', 1], ['milk-whole-2pt', 1], ['bananas-loose', 3]];
  if ([1, 4, 6].includes(week)) lines.push(['strawberries-400', 1]);
  if (week % 2 === 1) lines.push(['yoghurt-whole-500', 1]);
  return lines;
}

function withCreep(date, lines) {
  for (const sku of CREEP[date] ?? []) {
    const hit = lines.find(([s]) => s === sku);
    if (hit) hit[1] += 1; else lines.push([sku, 1]);
  }
  return lines.map(([sku, qty]) => ({ sku, qty }));
}

const orders = [
  ...MAINS.map((date, week) => ({
    id: `ord-${date}`,
    type: 'main',
    deliveredAt: `${date}T08:00:00+01:00`,
    slot: '07:00-09:00',
    lines: withCreep(date, mainBasket(week)),
  })),
  ...TOP_UPS.map(([date, time], week) => ({
    id: `ord-${date}`,
    type: 'top-up',
    deliveredAt: `${date}T${time}:00+01:00`,
    slot: time === '19:00' ? '18:00-20:00' : time === '09:00' ? '08:00-10:00' : '09:00-11:00',
    lines: withCreep(date, topUpBasket(week)),
  })),
].sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));

writeFileSync(out, JSON.stringify({ household: 'home', orders }, null, 2) + '\n');
console.log(`Wrote ${orders.length} orders to data/history.json`);
