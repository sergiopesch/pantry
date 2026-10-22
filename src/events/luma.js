// Luma guest exports: CSV in, guests with declared needs out. Diets come only from what guests typed into
// the registration question. Nothing is inferred from anywhere else.

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') cell += '"', i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [header = [], ...body] = rows.filter(r => r.some(v => v.trim()));
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// Needs a dish must meet. Allergies and coeliac are critical: planned for every sign-up, not the forecast.
export const NEEDS = {
  'nut-allergy': { label: 'Nut allergy', critical: true },
  coeliac: { label: 'Coeliac', critical: true },
  vegan: { label: 'Vegan' },
  vegetarian: { label: 'Vegetarian' },
  pescatarian: { label: 'Pescatarian' },
  halal: { label: 'Halal' },
  'gluten-free': { label: 'Gluten-free' },
  'dairy-free': { label: 'Dairy-free' },
  'no-pork': { label: 'No pork' },
};

const RULES = [
  [/\b(nut|peanut|tree ?nut)s?\b.*allerg|allerg.*\bnuts?\b|no nuts/i, 'nut-allergy'],
  [/coeliac|celiac/i, 'coeliac'],
  [/vegan|plant[- ]?based/i, 'vegan'],
  [/vegetarian|veggie/i, 'vegetarian'],
  [/pescatarian|pescetarian/i, 'pescatarian'],
  [/halal/i, 'halal'],
  [/gluten|\bgf\b/i, 'gluten-free'],
  [/dairy|lactose/i, 'dairy-free'],
  [/pork/i, 'no-pork'],
];
const PREFERENCES = [[/spic/i, 'mild']];

export function readDiet(answer = '') {
  const needs = new Set(RULES.filter(([re]) => re.test(answer)).map(([, n]) => n));
  if (needs.has('coeliac')) needs.add('gluten-free');
  if (needs.has('vegan')) needs.delete('vegetarian'), needs.delete('dairy-free');
  const prefs = PREFERENCES.filter(([re]) => re.test(answer)).map(([, p]) => p);
  return { needs: [...needs].sort(), prefs };
}

const findColumn = (cols, re) => cols.find(c => re.test(c));

export function importGuests(text) {
  const rows = parseCsv(text);
  const cols = Object.keys(rows[0] ?? {});
  const dietCol = findColumn(cols, /diet|allerg|food/i);
  const statusCol = findColumn(cols, /approval_status|status/i);
  const checkedCol = findColumn(cols, /checked_in/i);
  const idCol = findColumn(cols, /api_id|^id$/i);
  const all = rows.map((r, i) => ({
    ref: r[idCol] ?? `guest-${i + 1}`,
    name: r.name ?? [r.first_name, r.last_name].filter(Boolean).join(' '),
    status: (r[statusCol] ?? 'approved').toLowerCase(),
    checkedIn: Boolean(r[checkedCol]),
    answer: r[dietCol] ?? '',
    ...readDiet(r[dietCol] ?? ''),
  }));
  return {
    dietQuestion: dietCol ?? null,
    guests: all.filter(g => g.status === 'approved'),
    waitlist: all.filter(g => g.status === 'waitlist').length,
    declined: all.filter(g => g.status === 'declined').length,
  };
}
