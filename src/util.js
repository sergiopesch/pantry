// Small shared helpers: time in Europe/London, money, rounding.

export const TZ = 'Europe/London';
export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export const toDate = d => (d instanceof Date ? d : new Date(d));
export const daysBetween = (a, b) => (toDate(b) - toDate(a)) / DAY;
export const addDays = (d, n) => new Date(toDate(d).getTime() + n * DAY);
export const addHours = (d, n) => new Date(toDate(d).getTime() + n * HOUR);
export const iso = d => toDate(d).toISOString();

// Building an Intl.DateTimeFormat is expensive; the engine formats hundreds of dates per plan, so cache them.
const formatters = new Map();
function fmt(d, opts) {
  const key = JSON.stringify(opts);
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts })));
  return f.format(toDate(d));
}

export const weekday = d => fmt(d, { weekday: 'long' });
export const shortDay = d => fmt(d, { weekday: 'short' });
export const dayMonth = d => fmt(d, { day: 'numeric', month: 'long' });
export const longDate = d => `${weekday(d)} ${dayMonth(d)}`;
export const dateKey = d => fmt(d, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

export function hm(d) {
  const [h, m] = fmt(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).split(':').map(Number);
  return { h, m };
}

const h12 = h => h % 12 || 12;
const suffix = h => (h < 12 ? 'AM' : 'PM');

// "8 PM", "9:30 AM"
export function clock(d) {
  const { h, m } = hm(d);
  return m ? `${h12(h)}:${String(m).padStart(2, '0')} ${suffix(h)}` : `${h12(h)} ${suffix(h)}`;
}

// "4–6 PM", "11 AM–1 PM"
export function windowLabel(start, end) {
  const a = hm(start);
  const b = hm(end);
  const part = ({ h, m }) => (m ? `${h12(h)}:${String(m).padStart(2, '0')}` : `${h12(h)}`);
  return suffix(a.h) === suffix(b.h) ? `${part(a)}–${part(b)} ${suffix(b.h)}` : `${part(a)} ${suffix(a.h)}–${part(b)} ${suffix(b.h)}`;
}

export function partOfDay(d) {
  const { h } = hm(d);
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 19) return 'evening';
  return 'night';
}

export const round2 = n => Math.round(n * 100) / 100;
export const gbp = n => `£${round2(n).toFixed(2)}`;
export const money = n => (Math.abs(n) < 1 ? `${Math.round(Math.abs(n) * 100)}p` : gbp(Math.abs(n)));
export const pct = n => `${Math.round(n * 100)}%`;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numberWord = n => WORDS[n] ?? String(n);
export const capitalise = s => s.charAt(0).toUpperCase() + s.slice(1);

export function listJoin(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function shortId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function hoursLabel(h) {
  const r = Math.round(h);
  if (r <= 0) return 'no time';
  if (r === 1) return 'an hour';
  if (r < 48) return `${r} hours`;
  return `${Math.round(r / 24)} days`;
}

// "12 and 19 October", "30 September and 7 October"
export function dateList(dates) {
  const parts = dates.map(d => ({ day: fmt(d, { day: 'numeric' }), month: fmt(d, { month: 'long' }) }));
  if (parts.every(p => p.month === parts[0].month)) return `${listJoin(parts.map(p => p.day))} ${parts[0].month}`;
  return listJoin(parts.map(p => `${p.day} ${p.month}`));
}
