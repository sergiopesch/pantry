// Pantry — the app. Five tabs on the live engine: Today, Chat, Cart, Inbox, Home.
// On a laptop or projector it stands on the counter; keys 0–9 drive it for a Stream Deck, and every key
// does something real in the app (no slides). On a phone it is just the app.
import { appIcon, lockup, mark, wordmark } from './brand.js';
import { icon } from './icons.js';
import { installPhotoFallback, photo, props } from './art.js';

const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- formatting ----------------
const TZ = 'Europe/London';
const FMT = new Map();
function fmt(d, o) {
  const k = JSON.stringify(o);
  if (!FMT.has(k)) FMT.set(k, new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }));
  return FMT.get(k).format(new Date(d));
}
const weekday = d => fmt(d, { weekday: 'long' });
const shortDay = d => fmt(d, { weekday: 'short' });
const dateLine = d => `${weekday(d)} ${fmt(d, { day: 'numeric', month: 'long' })}`;
const dayMonth = d => fmt(d, { day: 'numeric', month: 'short' });
function hm(d) {
  const [h, m] = fmt(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).split(':').map(Number);
  return { h, m };
}
function clock(d) {
  const { h, m } = hm(d);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
const clockShort = d => { const { h, m } = hm(d); return `${h % 12 || 12}:${String(m).padStart(2, '0')}`; };
function partOfDay(d) {
  const { h } = hm(d);
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 19 ? 'evening' : 'night';
}
const gbp = n => `£${(Math.round(n * 100) / 100).toFixed(2)}`;
const money = n => (Math.abs(n) < 1 ? `${Math.round(Math.abs(n) * 100)}p` : gbp(Math.abs(n)));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const display = n => String(n).replace(/^Sainsbury's\s+/i, '');

// ---------------- api ----------------
// A phone pairs once with the ?key= link the server prints; the key then rides along on every call.
const PAIR = (() => {
  const k = new URLSearchParams(location.search).get('key');
  if (k) localStorage.setItem('pantry-key', k);
  return localStorage.getItem('pantry-key') ?? '';
})();
async function call(path, body) {
  const headers = { 'x-pantry-key': PAIR, ...(body === undefined ? {} : { 'content-type': 'application/json' }) };
  const res = await fetch(path, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? res.statusText), { code: data.code });
  return data;
}
const api = {
  snapshot: () => call('/api/snapshot'),
  edit: (key, action, extra = {}) => call('/api/cart/edit', { key, action, ...extra }),
  checkout: () => call('/api/checkout', {}),
  approve: id => call('/api/approve', { id }),
  decline: id => call('/api/decline', { id }),
  accept: id => call('/api/offers/accept', { id }),
  fileCase: id => call('/api/cases/file', { id }),
  keepCase: id => call('/api/cases/keep', { id }),
  say: text => call('/api/chat', { text }),
  act: action => call('/api/chat/act', { action }),
  clock: at => call('/api/clock', { at }),
  reset: () => call('/api/reset', {}),
};

// ---------------- state ----------------
let S = null;
const ui = { tab: 'today', seg: 'all', why: false, pay: 'idle', sheet: null, lock: false, splash: null, typing: false, pending: null, scroll: {}, busy: false };
const MEMBER_COLOURS = { adult: '#E8722B', child: '#1F9E8F' };

const els = {};
function refs() {
  for (const id of ['stage', 'device', 'screen', 'statusbar', 'views', 'overlay', 'tabbar', 'scrim', 'sheet', 'lock', 'splash', 'toast', 'presenter', 'caption', 'indicator']) els[id] = document.getElementById(id);
}

function toast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.remove('on'), 2200);
}

async function refresh() { S = await api.snapshot(); render(); }
async function run(promise, after) {
  try {
    const r = await promise;
    if (r?.snapshot) S = r.snapshot;
    after?.(r);
    render();
    return r;
  } catch (err) {
    toast(err.message);
    await refresh();
    return null;
  }
}

// ---------------- shared pieces ----------------
const avatar = m => `<span class="avatar" title="${esc(m.name)}" style="--c:${MEMBER_COLOURS[m.role] ?? '#B96A3A'}">${esc(m.name.charAt(0))}</span>`;
const membersFor = lane => {
  const all = S.household.members;
  if (lane === 'adults') return all.filter(m => m.role === 'adult');
  if (lane === 'child') return all.filter(m => m.role === 'child');
  return all;
};
const ruleFor = lane => (lane === 'everyone' ? 'What everyone eats' : S.story.split.rules[membersFor(lane)[0].id]);
const section = (title, body, extra = '', id = '') => `<section class="section"${id ? ` id="${id}"` : ''}><div class="section-title"><h2>${esc(title)}</h2>${extra}</div>${body}</section>`;

function roads() {
  return `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="M-20 160C80 130 140 190 230 150S360 70 430 92" stroke="#fff" stroke-width="15" fill="none" stroke-linecap="round"/>
    <path d="M70 -20C90 50 128 98 118 250" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M276 -20C266 60 312 110 302 250" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M-20 54C70 64 160 36 250 62S380 36 430 44" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>
    <circle cx="336" cy="178" r="30" fill="#DCEBCF"/><circle cx="170" cy="92" r="19" fill="#DCEBCF"/>
    <path d="M-20 204C90 190 200 220 430 200" stroke="#CFE4EA" stroke-width="16" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function dots(id, { big = false } = {}) {
  const max = Math.max(...id.shops.map(s => s.processedShare), 0.01);
  const last = id.shops.length - 1;
  const balls = id.shops.map((s, i) => {
    const size = (big ? 9 : 6) + Math.sqrt(s.processedShare / max) * (big ? 26 : 14);
    const c = s.processedShare === 0 ? '#CFE5C4' : `color-mix(in srgb, #C8553D ${Math.round(35 + 65 * (s.processedShare / max))}%, #F2C47A)`;
    return `<i class="${i === id.startIndex ? 'start' : ''}" style="--s:${size.toFixed(1)}px;--c:${c}" title="${esc(dayMonth(s.at))}"></i>`;
  }).join('');
  const labels = `<div class="dots-labels"><span>${esc(dayMonth(id.shops[0].at))}</span><span class="start">${esc(`${shortDay(id.startedAt)} ${dayMonth(id.startedAt)}`)}</span><span>${esc(dayMonth(id.shops[last].at))}</span></div>`;
  return `<div class="dots">${balls}<i class="base"></i></div>${labels}`;
}

function lineNote(l) {
  if (l.deal) return ['deal', `${l.deal.label} · ${money(l.deal.saving)} off`];
  if (l.replaced?.reason === 'learned') return ['learned', `Went missing twice, so ${String(l.replaced.text ?? '').split('. ').at(-1).replace(/^Loose/, 'loose').replace(/\.$/, '')}`];
  if (l.replaced?.reason === 'unavailable') return ['', `Your usual's out ${S.slot.day}. Pantry's pick`];
  if (l.replaced?.reason === 'you-swapped') return ['asked', 'Your swap'];
  if (l.rule === 'human-override') return ['asked', 'You asked for it'];
  if (l.requested) return ['asked', 'You asked for more'];
  if (l.runsOutAt) return ['', `Runs out ${shortDay(l.runsOutAt)} ${partOfDay(l.runsOutAt)}`];
  return ['', ''];
}

// ---------------- Today ----------------
function cups(left, fresh = false) {
  return Array.from({ length: 12 }, (_, i) => `<div class="cup"><div class="egg${i < left ? '' : ' gone'}${fresh ? ' fresh' : ''}"></div></div>`).join('');
}

function heroNudge() {
  const hook = S.story.hook;
  const eggs = S.predictions.find(p => p.family === 'eggs');
  if (!hook || !eggs) return '';
  const left = Math.max(0, Math.min(12, Math.ceil(eggs.stockNow - 1e-6)));
  const [headline, ...rest] = hook.nudge.split('. ');
  const mains = eggs.history.filter(e => e.type === 'main');
  const weeks = mains.map((m, i) => {
    const next = mains[i + 1] ? new Date(mains[i + 1].at) : Infinity;
    return eggs.history.some(e => e.type === 'top-up' && new Date(e.at) > new Date(m.at) && new Date(e.at) < next);
  });
  const why = ui.why
    ? `<div class="why-box">A dozen every ${esc(hook.mainDay)}, and a top-up dozen every week, ${weeks.filter(Boolean).length} weeks running. That's ${hook.perWeek} a week, so ${esc(hook.mainDay)}'s dozen is gone by ${esc(hook.runsOut)}. No questionnaire: just your baskets.
         <div class="weeks">${weeks.map(top => `<div class="wk"><i></i><i class="${top ? 'top' : 'none'}"></i></div>`).join('')}</div></div>`
    : '';
  return `<article class="hero">
      <div class="hero-top">
        <div class="noticed">${mark({ mood: 'notice', shadow: false })}Pantry noticed<time>${esc(clock(S.household.demoClock))}</time></div>
        <div class="carton">${cups(left)}</div>
        <div class="carton-legend"><span><b>${left} of 12</b> left from ${esc(hook.mainDay)}</span><span>Out ${esc(shortDay(eggs.runsOutAt))} ${esc(clock(eggs.runsOutAt))}</span></div>
      </div>
      <div class="hero-body"><h2>${esc(headline)}.</h2><p>${esc(rest.join('. '))}</p></div>
      ${why}
      <div class="hero-actions">
        <button class="btn btn-primary" data-act="tab" data-tab="cart">Review cart</button>
        <button class="btn btn-secondary" data-act="why">${ui.why ? 'Got it' : 'Why?'}</button>
      </div>
    </article>`;
}

function progressBar(p) {
  const at = p.steps.findIndex(s => s.id === p.status);
  return `<div class="progress">${p.steps.map((s, i) => `<div class="step${i < at ? ' done' : i === at ? (p.status === 'delivered' ? ' done' : ' done') : ''}"><span class="bar"></span>${esc(s.label)}</div>`).join('')}</div>`;
}

function heroBooked() {
  const o = S.order;
  const p = o.progress;
  const copy = {
    booked: [`${o.slotDay}, ${o.slotWindow}. Booked.`, `Two dozen eggs land before the last one goes. Paid ${gbp(o.total)} with a single-use card that's already dead.`],
    picking: ['They\'re picking your order.', `${o.count} things for ${o.slotDay} ${o.slotWindow}. I'll tell you about any substitutions.`],
    'on-its-way': ['On its way.', `Arriving ${o.slotDay} ${o.slotWindow}. Eggs, milk and bananas are on the van.`],
    delivered: ['Eggs are back in.', `Delivered ${p.steps.at(-1).time}, ${hm(new Date(S.critical?.runsOutAt ?? o.slotEnd)).h - hm(new Date(p.steps.at(-1).at)).h > 0 ? 'before the last egg went' : 'right on time'}. Nothing needs you.`],
  }[p.status];
  return `<article class="hero booked">
      <div class="hero-top">
        <div class="noticed">${mark({ mood: p.status === 'delivered' ? 'happy' : 'idle', shadow: false })}${esc(p.label)}<time>${esc(o.slotDay.slice(0, 3))} ${esc(o.slotWindow)}</time></div>
        ${progressBar(p)}
      </div>
      <div class="hero-body"><h2>${esc(copy[0])}</h2><p>${esc(copy[1])}</p></div>
      <div class="hero-actions"><button class="btn btn-primary" data-act="sheet" data-sheet="delivery">Track delivery</button></div>
    </article>`;
}

function deliveryCard() {
  const o = S.order;
  if (o?.progress.status === 'delivered' && S.next) {
    const n = S.next;
    return `<article class="card delivery-card tap" data-act="tab" data-tab="cart">
      <div class="map">${roads()}<i class="pin"></i></div>
      <div class="delivery-body">
        <div><div class="when">${esc(n.slot.day)} ${esc(dayMonth(n.slot.start))}, ${esc(n.slot.window)}</div><div class="muted">${n.totals.count} things · ${gbp(n.totals.total)} · already planned</div></div>
        <span class="chip">Draft</span>
      </div>
    </article>`;
  }
  const s = S.slot;
  return `<article class="card delivery-card tap" data-act="sheet" data-sheet="delivery">
      <div class="map">${roads()}<i class="pin${o ? ' locked' : ''}"></i></div>
      <div class="delivery-body">
        <div><div class="when">${esc(s.day)}, ${esc(s.window)}</div><div class="muted">${o ? o.count : S.totals.count} things · ${gbp(o ? o.total : S.totals.total)} · one-off slot</div></div>
        <span class="chip ${o ? 'gold' : ''}">${o ? esc(o.progress.label) : 'Not booked'}</span>
      </div>
    </article>`;
}

function peopleRow() {
  return `<div class="people">${['everyone', 'adults', 'child'].map(id => {
    const lane = S.lanes.find(l => l.id === id);
    const shown = lane.lines.slice(0, 4);
    return `<article class="card person tap" data-act="tab" data-tab="cart" data-seg="${id}">
        <div class="who"><h3>${esc(lane.label)}</h3><span class="avatars">${membersFor(id).map(avatar).join('')}</span></div>
        <div class="rule">${esc(ruleFor(id))}</div>
        <div class="stack">${shown.map(l => photo(l)).join('')}${lane.lines.length > shown.length ? `<span class="more">+${lane.lines.length - shown.length}</span>` : ''}</div>
        <div class="foot"><span>${lane.lines.length} thing${lane.lines.length === 1 ? '' : 's'}</span><span>${gbp(lane.subtotal)}</span></div>
      </article>`;
  }).join('')}</div>`;
}

function insightCard() {
  const id = S.identity;
  if (!id.drifted) return `<article class="card insight"><h3>${esc(id.text)}</h3></article>`;
  return `<article class="card insight tap" data-act="tab" data-tab="home" data-anchor="basket">
      <div class="insight-head">${mark({ mood: 'think', shadow: false })}<span class="eyebrow paprika">Pantry noticed</span></div>
      <h3>${esc(id.text)}</h3>
      ${dots(id)}
      <p>${esc(id.detail.split('. ')[0])}. They're off this week's cart.</p>
    </article>`;
}

function inboxCard() {
  const sum = S.inbox.summary;
  return `<article class="card row-card tap" data-act="tab" data-tab="inbox">
      <span class="icon-tile paprika">${icon.mail}</span>
      <div class="grow"><b>Pantry's inbox</b><div class="muted">${sum.silent} handled quietly${sum.needsYou ? ` · ${sum.needsYou} needs you` : ''}</div></div>
      ${sum.needsYou ? `<span class="count-badge">${sum.needsYou}</span>` : ''}
    </article>`;
}

function dealCard() {
  const d = S.story.deals;
  if (!d.offer) return '';
  const o = d.offer;
  const short = String(d.ask).replace(/ Want the switch\?$/, '').replace(/^It covers/, 'Covers');
  return `<article class="card deal-card">
      ${photo({ art: o.to.art, image: o.to.image }, 'thumb')}
      <div class="grow">
        <div class="eyebrow gold">Nectar · Monday</div>
        <b>${o.to.units === 6 ? 'The six-pack' : esc(display(o.to.name))}</b>
        <div class="price-drop"><s>${gbp(o.to.was)}</s><strong>${gbp(o.to.unitPrice)}</strong></div>
        <div class="muted">${esc(short)}</div>
      </div>
      ${d.accepted ? `<span class="chip leaf">${money(o.saving)} saved</span>` : `<button class="btn btn-sm btn-primary" data-act="offer" data-id="${esc(o.id)}">Switch</button>`}
    </article>`;
}

function today() {
  const now = new Date(S.now);
  const greet = { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good evening' }[partOfDay(now)];
  return `<header class="head"><div class="head-row"><div><div class="eyebrow">${esc(dateLine(now))}</div><h1 class="large">${greet}</h1></div>${mark({ shadow: false })}</div></header>
    ${S.order ? heroBooked() : heroNudge()}
    ${section('Next delivery', deliveryCard())}
    ${section('This week, by person', peopleRow(), '<button class="link" data-act="tab" data-tab="cart">See all</button>')}
    ${section('Your basket', insightCard())}
    ${section('Inbox', inboxCard())}
    ${S.story.deals.offer ? section('Next week', dealCard(), '', 'next-week') : ''}`;
}

// ---------------- Cart ----------------
function stepper(l) {
  return `<div class="stepper"><button data-act="dec" data-key="${esc(l.key)}" data-qty="${l.qty}" aria-label="One less">${icon.minus}</button><span>${l.qty}</span><button data-act="inc" data-key="${esc(l.key)}" data-qty="${l.qty}" aria-label="One more">${icon.plus}</button></div>`;
}

function row(l, { readOnly = false } = {}) {
  const [cls, note] = lineNote(l);
  const saving = l.deal?.saving ?? 0;
  const end = readOnly
    ? `<div class="price">${l.qty} × ${gbp(l.price / l.qty)}</div>`
    : `<div class="price">${saving ? `<s>${gbp(l.price)}</s>` : ''}${gbp(l.price - saving)}</div>${l.status === 'in' ? stepper(l) : `<button class="btn btn-sm btn-secondary" data-act="edit" data-key="${esc(l.key)}" data-action="include">Add back</button>`}`;
  return `<div class="row${l.status === 'out' ? ' off' : ''}">
      ${photo(l, 'thumb')}
      <div class="meta"${readOnly ? '' : ` data-act="sheet" data-sheet="product" data-key="${esc(l.key)}"`}><div class="name">${esc(display(l.name))}</div>${note && !readOnly ? `<div class="why ${cls}">${esc(note)}</div>` : ''}</div>
      <div class="end">${end}</div>
    </div>`;
}

function replacementCard() {
  const rep = S.story.replacement;
  if (!rep) return '';
  return `<article class="card swap-card">
      <div class="pair">
        <div class="mini usual"><span class="tag chip tomato">Out ${esc(S.slot.day.slice(0, 3))}</span>${photo(rep.usual)}<b>${esc(display(rep.usual.name))}</b><span class="p">${gbp(rep.usual.price)}</span></div>
        <div class="mini pick">${mark({ shadow: false })}${photo(rep.pick)}<b>${esc(display(rep.pick.name))}</b><span class="p">${gbp(rep.pick.price)} · ${rep.qty} ×</span></div>
      </div>
      <div class="opinion">${mark({ mood: 'notice', shadow: false })}<p>${esc(rep.opinion)}</p></div>
    </article>`;
}

function cartGroups(lines, { readOnly = false } = {}) {
  return ['everyone', 'adults', 'child'].filter(id => ui.seg === 'all' || ui.seg === id || readOnly).map(id => {
    const group = lines.filter(l => l.lane === id);
    if (!group.length) return '';
    const label = S.household.lanes[id];
    return `<div class="group-head"><span class="avatars">${membersFor(id).map(avatar).join('')}</span><h3>${esc(label)}</h3><span class="rule">${esc(ruleFor(id))}</span></div>
      <div class="rows">${group.map(l => row(l, { readOnly })).join('')}</div>`;
  }).join('');
}

function summaryCard(t) {
  return `<div class="card summary">
      <div class="sum-row"><span>Items</span><span>${gbp(t.subtotal)}</span></div>
      ${t.savings ? `<div class="sum-row good"><span>Nectar and coupons</span><span>−${gbp(t.savings)}</span></div>` : ''}
      <div class="sum-row"><span>Delivery, one-off slot</span><span>${gbp(t.fee)}</span></div>
      <div class="sum-row total"><span>Total</span><span>${gbp(t.total)}</span></div>
    </div>`;
}

function cart() {
  if (S.order) return orderView();
  const s = S.slot;
  const t = S.totals;
  const segs = [['all', 'All'], ['everyone', 'Everyone'], ['adults', 'Grown-ups'], ['child', 'Little one']];
  const left = S.cart.leftOut;
  const skipped = S.cart.skipped;
  return `<header class="head"><div class="eyebrow">${esc(s.date)} · ${esc(s.window)}</div><h1 class="large">${esc(s.day)}'s cart</h1><div class="sub">${t.count} things for three people, one cart</div></header>
    <div class="seg">${segs.map(([id, label]) => `<button class="${ui.seg === id ? 'on' : ''}" data-act="seg" data-seg="${id}">${label}</button>`).join('')}</div>
    ${ui.seg === 'all' ? replacementCard() : ''}
    ${cartGroups(S.cart.lines)}
    ${ui.seg === 'all' && left.length ? `<div class="group-head"><h3>Left off</h3><span class="rule">Treats are the grown-ups' call</span></div>
      <div class="rows">${left.map(l => `<div class="row off">${photo(l, 'thumb')}<div class="meta"><div class="name">${esc(display(l.name))}</div><div class="why">Crept in on 3 October</div></div><div class="end"><button class="btn btn-sm btn-secondary" data-act="add" data-sku="${esc(l.sku)}">Add</button></div></div>`).join('')}</div>` : ''}
    ${ui.seg === 'all' && skipped.length ? `<div class="group-head"><h3>Not needed yet</h3><span class="rule">Still enough at home</span></div>
      <div class="rows">${skipped.map(x => `<div class="row">${photo(x, 'thumb')}<div class="meta"><div class="name">${esc(display(x.name))}</div><div class="why">Fine till ${esc(shortDay(x.runsOutAt))} ${esc(dayMonth(x.runsOutAt))}</div></div></div>`).join('')}</div>` : ''}
    ${summaryCard(t)}
    <p class="fine">Egg prices are live from sainsburys.co.uk. The rest are estimates until Pantry's browser refreshes them.</p>
    <div class="section"><button class="btn btn-secondary btn-block" data-act="sheet" data-sheet="review">Review one by one</button></div>`;
}

function orderView() {
  const o = S.order;
  const lines = o.lines.map(l => ({ ...l, key: l.sku, pack: S.products[l.sku]?.pack ?? { units: 1, unit: 'item' }, status: 'in' }));
  const n = S.next;
  return `<header class="head"><div class="eyebrow">${esc(o.slotDate)} · ${esc(o.slotWindow)}</div><h1 class="large">${esc(o.slotDay)}'s order</h1><div class="sub">${o.count} things · paid ${gbp(o.total)}</div></header>
    <article class="card order-head tap" data-act="sheet" data-sheet="delivery">
      <div class="top"><span class="chip gold">${esc(o.progress.label)}</span><span class="muted" style="font-size:13px">Mastercard ···· ${esc(o.card.last4)} · dead</span></div>
      ${progressBar(o.progress)}
    </article>
    ${cartGroups(lines, { readOnly: true })}
    ${n ? section("Next week's draft", `<article class="card row-card"><span class="icon-tile">${icon.cart}</span><div class="grow"><b>${esc(n.slot.day)} ${esc(n.slot.window)}</b><div class="muted">${n.totals.count} things · ${gbp(n.totals.total)} · already planned</div></div></article>${S.story.deals.offer ? `<div style="height:12px"></div>${dealCard()}` : ''}`) : ''}`;
}

function payBar() {
  if (S.order) return '';
  const t = S.totals;
  const a = S.approval?.status === 'pending' ? S.approval : null;
  if (ui.pay === 'paid' && S.order === null) ui.pay = 'idle';
  if (ui.pay === 'asking' || ui.pay === 'scanning') {
    const prompt = a?.prompt ?? `Pantry wants to spend ${gbp(t.total)} at Sainsbury's.`;
    return `<div class="paybar"><div class="approve">
        <div class="approve-head"><span class="icon-tile teal">${icon.lock}</span><div><div class="eyebrow teal">Agentcard Vault</div><b>${esc(prompt)}</b></div></div>
        <div class="approve-terms"><span class="chip teal">Sainsbury's only</span><span class="chip teal">Up to ${gbp(a?.amount ?? t.total)}</span><span class="chip teal">12 hours</span><span class="chip teal">One charge</span></div>
        <button class="faceid-btn${ui.pay === 'scanning' ? ' scan' : ''}" data-act="approve">${icon.faceid}<span>${ui.pay === 'scanning' ? 'Face ID…' : 'Confirm with Face ID'}</span></button>
        <button class="btn btn-ghost btn-block" data-act="cancel-pay">Not now</button>
      </div></div>`;
  }
  return `<div class="paybar"><button class="btn btn-primary btn-block" data-act="pay">${icon.faceid}Pay ${gbp(t.total)}</button><div class="meta">${esc(S.slot.day)} ${esc(S.slot.window)} · single-use card · Face ID</div></div>`;
}

function paidBar(order) {
  return `<div class="paybar"><div class="approve">
      <button class="faceid-btn ok">${icon.check}<span>Paid ${gbp(order.total)}</span></button>
      <div class="vcard-row" id="vcard"><span class="mini-card"></span><div><b>Mastercard ···· ${esc(order.card.last4)}</b><div class="muted">Swapped in for one purchase at Sainsbury's.</div></div></div>
    </div></div>`;
}

// ---------------- Inbox ----------------
const senderOf = from => (/nectar/i.test(from) ? ['N', 'nectar'] : ['S', '']);

function mailCard(i, actions) {
  const [letter, cls] = senderOf(i.from);
  return `<article class="card mail-card">
      <div class="mail-top"><span class="sender ${cls}">${letter}</span><b>${esc(i.subject)}</b><time>${esc(shortDay(i.receivedAt))} ${esc(clock(i.receivedAt))}</time></div>
      <div class="mail-note">${mark({ mood: 'notice', shadow: false })}<p>${esc(i.note)}</p></div>
      ${actions ? `<div class="mail-actions">${actions}</div>` : ''}
    </article>`;
}

function inbox() {
  const items = [...S.inbox.items].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const needs = items.filter(i => i.action === 'needs-you');
  const drafted = items.filter(i => i.action === 'case-drafted');
  const quiet = items.filter(i => i.silent || (i.action === 'filed' && !needs.includes(i)));
  return `<header class="head"><div class="eyebrow">${esc(S.inboxAddress)}</div><h1 class="large">Inbox</h1><div class="sub">${esc(S.inbox.text)}</div></header>
    ${needs.length ? section('Needs you', needs.map(i => mailCard(i, `<button class="btn btn-sm btn-secondary" data-act="keep-case" data-id="${esc(i.caseId)}">Keep them</button><button class="btn btn-sm btn-primary" data-act="file-case" data-id="${esc(i.caseId)}">Ask for a refund</button>`)).join('')) : ''}
    ${drafted.length ? section('Ready to file', drafted.map(i => mailCard(i, `<button class="btn btn-sm btn-primary" data-act="file-case" data-id="${esc(i.caseId)}">File refund case</button>`)).join('')) : ''}
    ${S.inbox.learnings.length ? section('Learned', S.inbox.learnings.map(l => `<article class="card row-card"><span class="icon-tile teal">${icon.leaf}</span><div class="grow"><b>${esc(l.text.split('. ').at(-1))}</b><div class="muted">${esc(l.text.split('. ').slice(0, -1).join('. '))}.</div></div></article>`).join('')) : ''}
    ${section('Handled quietly', `<div class="quiet-list" style="margin:0">${quiet.map(i => {
      const [letter, cls] = senderOf(i.from);
      return `<div class="quiet"><span class="sender ${cls}">${letter}</span><div class="grow"><b>${esc(i.subject)}</b><div class="muted">${esc(i.note)}</div></div><span class="check">${icon.check}</span></div>`;
    }).join('')}</div>`)}`;
}

// ---------------- Home ----------------
const SHORT = { pizza: 'Pizza', crisps: 'Crisps', nuggets: 'Nuggets', brioche: 'Brioche', biscuits: 'Digestives', 'ready-meals': 'Lasagne' };
function windowWords(w) {
  const [a, b] = w.split('-').map(t => Number(t.split(':')[0]));
  const h = x => x % 12 || 12;
  return `${h(a)}–${h(b)} ${b < 12 ? 'AM' : 'PM'}`;
}
const CHIP_WORDS = { flour: 'No flour', 'ultra-processed': 'Nothing processed', caffeine: 'No caffeine', spicy: 'No spice' };
function memberChips(m) {
  if (m.needs?.length) return [...m.needs.map(n => `<span class="chip teal">${n === 'toddler' ? 'Toddler staples' : n.charAt(0).toUpperCase() + n.slice(1)}</span>`), ...(m.avoid ?? []).map(a => `<span class="chip">${CHIP_WORDS[a] ?? `No ${a}`}</span>`)].join('');
  return [...(m.avoid ?? []).slice(0, 1).map(a => `<span class="chip">${CHIP_WORDS[a]}</span>`), ...(m.limit ?? []).map(l => `<span class="chip">Minimal ${l}</span>`), ...(m.avoid ?? []).slice(1).map(a => `<span class="chip">${CHIP_WORDS[a]}</span>`)].join('');
}

function home() {
  const h = S.household;
  const id = S.identity;
  const conn = (ic, tile, name, text, state, label) => `<div class="conn"><span class="icon-tile ${tile}">${ic}</span><div class="grow"><b>${name}</b><div class="muted">${text}</div></div><span class="state ${state}"><i></i>${label}</span></div>`;
  return `<header class="head"><div class="eyebrow">Household</div><h1 class="large">${esc(h.name)}</h1></header>
    <div class="card members">${h.members.map(m => `<div class="member">${avatar(m)}<div class="grow"><b>${esc(m.name)}</b> <span class="muted" style="font-size:14px">${m.role === 'child' ? esc(m.age ?? 'child') : 'grown-up'}</span><div class="chips">${memberChips(m)}</div></div></div>`).join('')}</div>
    <p class="policy">When rules clash, her needs win on staples and the grown-ups win on treats. One cart, no separate lists.</p>
    ${id.drifted ? section('Your basket', `<article class="card drift-full">
        <div class="insight-head">${mark({ mood: 'think', shadow: false })}<span class="eyebrow paprika">${id.shops.length} shops since ${esc(dayMonth(id.shops[0].at))}</span></div>
        <h3 style="font-family:var(--display);font-size:20px;line-height:25px;font-weight:700;letter-spacing:-.015em">${esc(id.text)}</h3>
        ${dots(id, { big: true })}
        <p class="muted" style="font-size:14.5px;line-height:20px">${esc(id.detail)} Processed food went from ${Math.round(id.before * 100)}% of spend to ${Math.round(id.after * 100)}%.</p>
        <div class="bring-back">${S.cart.leftOut.map(l => `<button class="btn btn-sm btn-secondary" data-act="add" data-sku="${esc(l.sku)}">${photo(l)}${esc(SHORT[l.family] ?? display(l.name))}</button>`).join('') || '<span class="muted">Everything you asked for is back in.</span>'}</div>
      </article>`, '', 'basket') : ''}
    ${section('Connections', `<div class="card">
        ${conn(icon.store, 'paprika', "Sainsbury's", 'Pantry browses in a real browser. Egg prices are live; the rest refresh on its next visit.', 'demo', 'Partial')}
        ${conn(icon.key, '', '1Password', 'Logins stay in the vault. Pantry points at the item and never sees the password.', '', 'Connect')}
        ${conn(icon.lock, 'teal', 'Agentcard Vault', 'Your card stays on your phone. Face ID approves every spend, one merchant and one amount at a time.', 'demo', S.driver === 'stub' ? 'Demo driver' : 'Live')}
        ${conn(icon.mail, 'gold', "Pantry's inbox", `${esc(S.inboxAddress)} receives every Sainsbury's email.`, 'demo', 'Fixture mail')}
        ${conn(icon.chat, '', 'Grok', 'Grok mobile, Grok desktop, X DMs and Android. One conversation everywhere.', '', 'Set up')}
      </div>`, '', 'trust')}
    ${section('Delivery', `<div class="card">
        ${conn(icon.clock, 'gold', 'Preferred windows', h.delivery.preferredWindows.map(windowWords).join(' or ') + ', after nursery pick-up.', 'live', 'Set')}
        ${conn(icon.van, '', 'One-off slots only', 'Never a delivery pass. Pantry books the latest slot that still lands 90 minutes before anything runs out.', 'live', 'On')}
      </div>`)}
    <div class="card about">${lockup()}<p>You are what you shop.</p><p style="font-size:12.5px;color:var(--ink-3)">Pantry 0.2 · made for ${esc(h.name)}</p></div>`;
}

// ---------------- Chat ----------------
function chatCard(card) {
  if (!card) return '';
  const t = S.totals;
  switch (card.type) {
    case 'cart':
      if (S.order) return chatCard({ type: 'delivery' });
      return `<div class="msg-card"><div class="lanes">${S.lanes.map(l => `<span class="chip">${esc(l.label)} · ${l.lines.length}</span>`).join('')}</div>
        <div class="total"><span>${esc(S.slot.day)} ${esc(S.slot.window)}</span><span>${gbp(t.total)}</span></div>
        <div class="actions"><button class="btn btn-sm btn-secondary" data-act="tab" data-tab="cart">Review cart</button></div></div>`;
    case 'product': {
      const l = S.cart.lines.find(x => x.sku === card.sku);
      if (!l) return '';
      return `<div class="msg-card"><div class="line">${photo(l, 'thumb')}<div class="grow"><b>${esc(display(l.name))}</b>${l.qty} × ${gbp(l.unitPrice)}</div></div></div>`;
    }
    case 'approval': {
      if (S.order) return `<div class="msg-card"><div class="line"><span class="icon-tile teal">${icon.check}</span><div class="grow"><b>Paid ${gbp(S.order.total)}</b>Single-use card ···· ${esc(S.order.card.last4)}, now dead.</div></div></div>`;
      if (S.approval?.status !== 'pending') return '';
      return `<div class="msg-card"><div class="line"><span class="icon-tile teal">${icon.lock}</span><div class="grow"><b>${esc(S.approval.prompt)}</b>Agentcard Vault · one merchant, one amount, 12 hours</div></div>
        <button class="faceid-btn${ui.pay === 'scanning' ? ' scan' : ''}" data-act="approve">${icon.faceid}<span>${ui.pay === 'scanning' ? 'Face ID…' : 'Confirm with Face ID'}</span></button></div>`;
    }
    case 'delivery': {
      const o = S.order;
      return `<div class="msg-card tap" data-act="sheet" data-sheet="delivery"><div class="map">${roads()}<i class="pin${o ? ' locked' : ''}"></i></div>
        <div class="total"><span>${esc(S.slot.day)}, ${esc(S.slot.window)}</span><span class="chip ${o ? 'gold' : ''}">${o ? esc(o.progress.label) : 'Not booked'}</span></div></div>`;
    }
    case 'deal': {
      const d = S.story.deals;
      if (!d.offer) return '';
      return `<div class="msg-card"><div class="line">${photo({ art: d.offer.to.art, image: d.offer.to.image }, 'thumb')}<div class="grow"><b>${gbp(d.offer.to.unitPrice)} with Nectar</b><span class="muted">was ${gbp(d.offer.to.was)} · saves ${money(d.offer.saving)} a week</span></div></div>
        <div class="actions">${d.accepted ? '<span class="chip leaf">Switched</span>' : `<button class="btn btn-sm btn-primary" data-act="offer" data-id="${esc(d.offer.id)}">Switch</button>`}</div></div>`;
    }
    case 'inbox':
      return `<div class="msg-card"><div class="actions"><button class="btn btn-sm btn-secondary" data-act="tab" data-tab="inbox">Open inbox</button></div></div>`;
    case 'insight':
      return S.identity.drifted ? `<div class="msg-card">${dots(S.identity)}<div class="actions"><button class="btn btn-sm btn-secondary" data-act="tab" data-tab="home" data-anchor="basket">See the pattern</button></div></div>` : '';
    case 'household':
      return `<div class="msg-card">${S.household.members.map(m => `<div class="line">${avatar(m)}<div class="grow"><b>${esc(m.name)}</b>${esc(m.summary)}</div></div>`).join('')}</div>`;
    case 'predictions':
      return `<div class="msg-card">${S.predictions.filter(p => S.cart.lines.some(l => l.family === p.family && l.status === 'in')).slice(0, 4).map(p => `<div class="total" style="font-weight:600"><span>${esc(p.family.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()))}</span><span class="muted">${esc(shortDay(p.runsOutAt))} ${esc(clock(p.runsOutAt))}</span></div>`).join('')}</div>`;
    case 'confirm':
      return `<div class="msg-card">${card.text ? `<div class="muted" style="font-size:14px">${esc(card.text)}</div>` : ''}<div class="actions">${card.actions.map((a, i) => `<button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}" data-act="chat-act" data-action="${esc(JSON.stringify(a.action))}">${esc(a.label)}</button>`).join('')}</div></div>`;
    default:
      return '';
  }
}

function chat() {
  const msgs = [...S.messages, ...(ui.pending ? [ui.pending] : [])];
  let last = null;
  const html = msgs.map(m => {
    const label = m.surface === 'app' ? 'Pantry app' : m.surfaceLabel ?? m.surface;
    const time = clock(m.at);
    const stamp = !last || last.label !== label || last.time !== time ? `<div class="stamp">${esc(label)} · ${esc(time)}</div>` : '';
    last = { label, time };
    const mine = m.from !== 'pantry';
    return `${stamp}<div class="bubble ${mine ? 'me' : 'them'}">${esc(m.text)}</div>${mine ? '' : chatCard(m.card)}`;
  }).join('');
  return `<div class="chat-head">${mark({ mood: ui.typing ? 'think' : 'idle', shadow: false })}<div><b>Pantry</b><div class="muted">Grok mobile · desktop · X DMs · Android</div></div></div>
    <div class="msgs">${html}${ui.typing ? '<div class="typing"><i></i><i></i><i></i></div>' : ''}</div>`;
}

function suggestions() {
  if (S.order) return ['When does it arrive?', 'Any deals?', 'How are we eating?', 'Anything in the inbox?'];
  return ["What's running out?", "She's asking for blueberries", 'Why no pizza?', 'Why loose bananas?', 'OK, buy it'];
}

function composer() {
  return `<div class="composer-wrap">
      <div class="suggest">${suggestions().map(s => `<button data-act="say" data-text="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="composer" id="composer"><input id="say" placeholder="Message Pantry" autocomplete="off" enterkeyhint="send" aria-label="Message Pantry"><button type="submit">Send</button></form>
    </div>`;
}

async function send(text) {
  text = String(text ?? '').trim();
  if (!text || ui.typing) return;
  ui.pending = { id: 'pending', at: S.now, from: S.household.members[0].id, surface: 'app', text };
  ui.typing = true;
  render();
  const started = Date.now();
  try {
    const r = await api.say(text);
    await sleep(Math.max(0, 650 - (Date.now() - started)));
    S = r.snapshot;
  } catch (err) {
    toast(err.message);
  }
  ui.pending = null;
  ui.typing = false;
  render();
}

// ---------------- sheets ----------------
function sheetHtml() {
  const s = ui.sheet;
  if (!s) return '';
  const top = title => `<div class="sheet-top"><h2>${esc(title)}</h2><button class="sheet-close" data-act="close-sheet" aria-label="Close">${icon.close}</button></div>`;

  if (s.type === 'delivery') {
    const o = S.order;
    const slot = S.slot;
    const tl = o ? `<div class="timeline">${o.progress.steps.map(st => `<div class="tl${st.done ? ' done' : ''}${st.id === o.progress.status ? ' now' : ''}"><span class="node">${st.done ? icon.check : ''}</span><div><b>${esc(st.label)}</b><div class="muted">${esc(shortDay(st.at))} ${esc(st.time)}</div></div></div>`).join('')}</div>` : '';
    const receipt = o ? section('Paid', `<div class="card">
        <div class="conn"><span class="icon-tile teal">${icon.lock}</span><div class="grow"><b>Mastercard ···· ${esc(o.card.last4)}</b><div class="muted">Single-use, Sainsbury's only. Swapped in for this order, then dead.</div></div><span class="state"><i></i>Dead</span></div>
        <div class="conn"><span class="icon-tile">${icon.cart}</span><div class="grow"><b>${o.count} things · ${gbp(o.total)}</b><div class="muted">Includes the one-off slot. No subscription.</div></div></div></div>`) : '';
    return `${top(o ? 'Your delivery' : `${slot.day}'s slot`)}<div class="sheet-body">
        <div class="map big">${roads()}<i class="pin${o ? ' locked' : ''}"></i></div>
        <div class="section" style="margin-top:18px"><div class="eyebrow gold">${o ? esc(o.progress.label) : 'Held, not booked'}</div><div class="large" style="font-size:30px;line-height:36px">${esc(slot.day)}, ${esc(slot.window)}</div><p class="sub">${esc(S.story.close.landsBefore)}</p></div>
        ${tl}${receipt}
        ${o ? '' : '<div class="section"><button class="btn btn-primary btn-block" data-act="tab" data-tab="cart">Review and pay</button></div>'}
      </div>`;
  }

  if (s.type === 'review') {
    const lines = S.cart.lines;
    const cards = lines.map(l => {
      const [, note] = lineNote(l);
      const who = membersFor(l.lane);
      return `<article class="rcard${l.status === 'out' ? ' off' : ''}" data-key="${esc(l.key)}">
          ${photo(l)}
          <div class="name">${esc(display(l.name))}</div>
          <div class="note">${esc(note || l.why || '')}</div>
          <div class="meta-row"><strong>${l.qty} × ${gbp(l.unitPrice)}</strong><span class="avatars">${(l.eaters?.length ? S.household.members.filter(m => l.eaters.includes(m.id)) : who).map(avatar).join('')}</span></div>
          <div class="acts">
            <button class="keep${l.status === 'in' ? ' on' : ''}" data-act="review" data-op="include" data-key="${esc(l.key)}">${icon.check}Keep</button>
            <button data-act="review" data-op="swap" data-key="${esc(l.key)}" ${l.alternatives.length ? '' : 'disabled style="opacity:.4"'}>${icon.swap}Swap</button>
            <button class="drop${l.status === 'out' ? ' on' : ''}" data-act="review" data-op="exclude" data-key="${esc(l.key)}">${icon.close}Drop</button>
          </div>
        </article>`;
    }).join('');
    return `${top('Review, one by one')}<div class="review"><div class="review-strip" id="strip">${cards}</div>
        <div class="review-foot"><span id="rcount">1 of ${lines.length}</span><span>${S.totals.count} in · ${gbp(S.totals.total)}</span></div></div>`;
  }

  if (s.type === 'product') {
    const l = S.cart.lines.find(x => x.key === s.key);
    if (!l) return '';
    const [, note] = lineNote(l);
    const alts = l.alternatives.map(sku => S.products[sku]).filter(Boolean);
    const who = S.household.members.filter(m => l.eaters.includes(m.id));
    return `${top(display(l.name))}<div class="sheet-body">
        <div class="section" style="margin-top:6px">${photo(l).replace('class="photo', 'style="aspect-ratio:1.4;border-radius:22px" class="photo')}</div>
        <div class="section" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center"><div><div class="large" style="font-size:28px;line-height:34px">${gbp(l.unitPrice)}</div><div class="sub">${esc(note)}</div></div>${l.status === 'in' && !S.order ? stepper(l) : ''}</div>
        ${section("Who it's for", `<div class="card"><div class="conn"><span class="avatars">${who.map(avatar).join('')}</span><div class="grow"><b>${esc(S.household.lanes[l.lane] ?? 'Everyone')}</b><div class="muted">${esc(l.why || 'Everyone in the house eats it.')}</div></div></div></div>`)}
        ${alts.length && !S.order ? section('Swap for', `<div class="card">${alts.map(p => `<div class="conn">${photo(p, 'thumb')}<div class="grow"><b>${esc(display(p.name))}</b><div class="muted">${gbp(p.price)} · ${money(p.price / p.pack.units)} per ${esc(p.pack.unit)}</div></div><button class="btn btn-sm btn-secondary" data-act="edit" data-key="${esc(l.key)}" data-action="swap" data-sku="${esc(p.sku)}">Swap</button></div>`).join('')}</div>`) : ''}
        ${l.status === 'in' && !S.order ? '<div class="section"><button class="btn btn-secondary btn-block" data-act="edit" data-key="' + esc(l.key) + '" data-action="exclude">Drop from this week</button></div>' : ''}
      </div>`;
  }
  return '';
}

// ---------------- lock screen and splash ----------------
function lockHtml() {
  const now = new Date(S.now);
  const notes = S.notifications.slice(0, 2);
  const rel = at => { const mins = (now - new Date(at)) / 60000; return mins < 1 ? 'now' : mins < 60 ? `${Math.round(mins)}m ago` : clock(at); };
  return `<i class="bokeh" style="width:180px;height:180px;left:-40px;top:240px"></i><i class="bokeh" style="width:110px;height:110px;right:20px;top:120px"></i><i class="bokeh" style="width:240px;height:240px;right:-80px;top:470px;opacity:.6"></i>
    <div class="lock-date">${esc(dateLine(now))}</div>
    <div class="lock-time">${esc(clockShort(now))}</div>
    <div class="notifs">${notes.map((n, i) => {
      const [first, ...rest] = n.body.split('. ');
      return `<div class="notif" style="--d:${0.45 + i * 0.15}s" data-act="unlock" data-route="${esc(n.route)}">${appIcon({ size: 40 })}<div><div class="top"><span>${n.title === 'Pantry' ? 'Pantry' : esc(n.title)}</span><time>${esc(rel(n.at))}</time></div><p><b>${esc(first)}.</b> ${esc(rest.join('. '))}</p></div></div>`;
    }).join('')}</div>
    <div class="lock-hint">Tap a notification to open</div>`;
}

function splashHtml(kind) {
  if (kind === 'vision') return `<div class="inner">${appIcon({ size: 96 })}<div class="vision">Same engine.<span>Household to a room of fifty.</span></div></div>`;
  return `<div class="inner">${appIcon({ size: 128 })}${wordmark({ color: '#fff' })}<div class="tag">You are what you shop.</div></div>`;
}

// ---------------- render ----------------
const SCREENS = { today, chat, cart, inbox, home };
const TABS = [['today', 'Today', icon.today], ['chat', 'Chat', icon.chat], ['cart', 'Cart', icon.cart], ['inbox', 'Inbox', icon.inbox], ['home', 'Home', icon.home]];

function render() {
  if (!S) return;
  const dark = ui.lock || ui.splash;
  els.statusbar.classList.toggle('light', Boolean(dark));
  els.indicator.classList.toggle('light', Boolean(dark));
  $('.sb-time', els.statusbar).textContent = clockShort(S.now);

  const needs = S.inbox.summary.needsYou;
  els.tabbar.innerHTML = TABS.map(([id, label, ic]) => `<button class="tab${ui.tab === id ? ' on' : ''}" data-act="tab" data-tab="${id}">${ic}${label}${id === 'inbox' && needs ? `<span class="badge">${needs}</span>` : ''}${id === 'cart' && !S.order ? `<span class="badge" style="background:var(--ink)">${S.totals.count}</span>` : ''}</button>`).join('');

  const old = els.views.querySelector('.view');
  const same = old?.dataset.tab === ui.tab;
  if (old && !same) ui.scroll[old.dataset.tab] = old.scrollTop;
  const top = same ? old.scrollTop : ui.scroll[ui.tab] ?? 0;
  const view = document.createElement('div');
  view.className = `view ${ui.tab}-view`;
  view.dataset.tab = ui.tab;
  view.innerHTML = SCREENS[ui.tab]();
  if (same) view.style.animation = 'none';
  els.views.replaceChildren(view);
  view.scrollTop = ui.tab === 'chat' ? view.scrollHeight : top;

  const draft = $('#say')?.value ?? '';
  els.overlay.innerHTML = ui.tab === 'chat' ? composer() : ui.tab === 'cart' ? (ui.pay === 'paid' && S.order ? paidBar(S.order) : payBar()) : '';
  if (ui.tab === 'chat') {
    const input = $('#say');
    input.value = draft;
    $('#composer').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
  }

  const sheetOpen = Boolean(ui.sheet);
  const strip = $('#strip');
  const stripLeft = strip?.scrollLeft ?? 0;
  if (sheetOpen) els.sheet.innerHTML = sheetHtml();
  els.sheet.classList.toggle('open', sheetOpen);
  els.scrim.classList.toggle('on', sheetOpen);
  const newStrip = $('#strip');
  if (newStrip) {
    newStrip.scrollLeft = stripLeft;
    newStrip.onscroll = () => { const i = Math.round(newStrip.scrollLeft / (newStrip.clientWidth - 50)); const c = $('#rcount'); if (c) c.textContent = `${Math.min(S.cart.lines.length, i + 1)} of ${S.cart.lines.length}`; };
  }

  if (ui.lock) { els.lock.innerHTML = lockHtml(); els.lock.hidden = false; requestAnimationFrame(() => els.lock.classList.remove('away')); }
  if (ui.splash) { els.splash.innerHTML = splashHtml(ui.splash); els.splash.classList.remove('hidden'); } else els.splash.classList.add('hidden');
  els.presenter.querySelector('.time').textContent = `${shortDay(S.now)} ${clock(S.now)}`;
}

// ---------------- actions ----------------
function goTab(tab, { seg, anchor, top } = {}) {
  if (ui.lock) {
    ui.lock = false;
    els.lock.classList.add('away');
    setTimeout(() => { if (!ui.lock) els.lock.hidden = true; }, 650);
  }
  if (seg) ui.seg = seg;
  ui.tab = tab;
  ui.sheet = null;
  if (top) ui.scroll[tab] = 0;
  render();
  const view = els.views.querySelector('.view');
  if (anchor) requestAnimationFrame(() => {
    const target = document.getElementById(anchor);
    if (target && view) view.scrollTo({ top: Math.max(0, target.offsetTop - 58), behavior: 'smooth' });
  });
  else if (top) view?.scrollTo({ top: 0 });
}

async function startPay() {
  if (S.order) return;
  ui.pay = 'asking';
  await run(api.checkout());
}

async function approveNow() {
  if (ui.busy || S.order) return;
  if (S.approval?.status !== 'pending') await startPay();
  if (S.approval?.status !== 'pending') return;
  ui.busy = true;
  ui.pay = 'scanning';
  render();
  await sleep(1100);
  const r = await run(api.approve(S.approval.id));
  ui.busy = false;
  if (!r) { ui.pay = 'idle'; return render(); }
  ui.pay = 'paid';
  render();
  setTimeout(() => $('#vcard')?.classList.add('dead'), 900);
  if (ui.tab === 'chat') await run(api.act({ type: 'noop', text: `Paid ${gbp(S.order.total)}. ${S.order.slotDay}, ${S.order.slotWindow} is booked. The card's already dead.` }));
  toast(`Booked. ${S.order.slotDay}, ${S.order.slotWindow}.`);
}

function unlock(route = 'today') {
  els.lock.classList.add('away');
  ui.lock = false;
  goTab(route, { top: true });
  setTimeout(() => { if (!ui.lock) els.lock.hidden = true; }, 650);
}

const ACTIONS = {
  tab: d => { if (d.tab === 'cart' && ui.tab !== 'cart' && !d.seg) ui.seg = 'all'; goTab(d.tab, { seg: d.seg, anchor: d.anchor }); },
  why: () => { ui.why = !ui.why; render(); },
  seg: d => { ui.seg = d.seg; render(); },
  inc: d => run(api.edit(d.key, 'qty', { qty: Number(d.qty) + 1 })),
  dec: d => run(Number(d.qty) <= 1 ? api.edit(d.key, 'exclude') : api.edit(d.key, 'qty', { qty: Number(d.qty) - 1 })),
  edit: d => run(api.edit(d.key, d.action, d.sku ? { sku: d.sku } : {}), () => { if (d.action === 'swap') { toast('Swapped.'); ui.sheet = null; } }),
  add: d => run(api.edit('', 'add', { sku: d.sku, qty: 1 }), () => toast('Back in the cart.')),
  review: async d => {
    const line = S.cart.lines.find(l => l.key === d.key);
    const sku = d.op === 'swap' ? line?.alternatives[0] : undefined;
    await run(api.edit(d.key, d.op, sku ? { sku } : {}));
    if (d.op !== 'swap') { const strip = $('#strip'); strip?.scrollBy({ left: strip.clientWidth - 50, behavior: 'smooth' }); }
  },
  pay: () => startPay(),
  approve: () => approveNow(),
  'cancel-pay': async () => { const id = S.approval?.id; ui.pay = 'idle'; if (id && S.approval.status === 'pending') await run(api.decline(id)); else render(); },
  sheet: d => { ui.sheet = { type: d.sheet, key: d.key }; render(); },
  'close-sheet': () => { ui.sheet = null; render(); },
  offer: d => run(api.accept(d.id), r => toast(`Switched. ${money(r.saving)} off next week.`)),
  'file-case': d => run(api.fileCase(d.id), () => toast('Case filed with Sainsbury\'s.')),
  'keep-case': d => run(api.keepCase(d.id), () => toast('Kept. Noted for next time.')),
  say: d => send(d.text),
  'chat-act': d => run(api.act(JSON.parse(d.action))),
  unlock: d => unlock(d.route),
};

function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const fn = ACTIONS[t.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(t.dataset, t);
}

// ---------------- presenter: keys 0–9, one per beat, each doing something real in the app ----------------
const T = {
  nudge: '2026-10-20T06:02:00+01:00',
  dinner: '2026-10-20T19:12:00+01:00',
  way: '2026-10-22T16:20:00+01:00',
  done: '2026-10-22T17:48:00+01:00',
};
const setClock = at => run(api.clock(at));
const showSplash = kind => { ui.splash = kind; ui.lock = false; els.lock.hidden = true; render(); };
const hideSplash = () => { ui.splash = null; };
const caption = text => { els.caption.textContent = text ?? ''; els.caption.classList.toggle('on', Boolean(text)); };

const BEATS = [
  { id: 'brand', auto: [8], steps: [() => showSplash('brand')] },
  {
    id: 'hook', auto: [6, 7, 6],
    steps: [
      async () => { hideSplash(); await setClock(T.nudge); ui.lock = true; ui.tab = 'today'; render(); caption(S.story.hook?.lines[2]); },
      () => { unlock('today'); caption(S.story.hook?.lines[3]); },
      () => { ui.why = true; render(); caption('Learned from baskets, not a questionnaire.'); },
    ],
  },
  { id: 'split', auto: [15], steps: [() => { hideSplash(); goTab('cart', { seg: 'all', top: true }); caption('One cart, three people, three rules.'); }] },
  { id: 'identity', auto: [14], steps: [() => { hideSplash(); goTab('home', { anchor: 'basket' }); caption(S.identity.text); }] },
  { id: 'trust', auto: [12], steps: [() => { hideSplash(); goTab('home', { anchor: 'trust' }); caption('Logins in 1Password. Card in Agentcard Vault, behind Face ID.'); }] },
  { id: 'continuity', auto: [15], steps: [async () => { hideSplash(); await setClock(T.dinner); goTab('chat'); caption('Nudged at 6 AM. Answered at lunch. Closed at dinner.'); }] },
  {
    id: 'cards', auto: [10, 12],
    steps: [
      () => { hideSplash(); goTab('cart', { seg: 'all', top: true }); caption("Your usual beside today's pick."); },
      () => { ui.sheet = { type: 'review' }; render(); caption('Keep, drop or swap anything with one tap.'); },
    ],
  },
  {
    id: 'close', auto: [5, 6, 6, 4, 4, 7],
    steps: [
      async () => { hideSplash(); ui.sheet = null; goTab('cart'); await startPay(); caption(S.story.close.prompt); },
      async () => { await approveNow(); caption('Approved with Face ID. Single-use card, now dead.'); },
      () => { ui.sheet = { type: 'delivery' }; render(); caption(S.story.close.landsBefore); },
      () => setClock(T.way),
      () => setClock(T.done),
      () => { ui.sheet = null; goTab('inbox', { top: true }); caption(S.inbox.text); },
    ],
  },
  {
    id: 'deals', auto: [6, 5],
    steps: [
      () => { hideSplash(); goTab('today', { anchor: 'next-week' }); caption(S.story.deals.headline); },
      async () => { const o = S.story.deals.offer; if (o && !S.story.deals.accepted) await run(api.accept(o.id), r => toast(`Switched. ${money(r.saving)} off next week.`)); caption(S.story.deals.done); },
    ],
  },
  { id: 'vision', auto: [15], steps: [() => { showSplash('vision'); caption(''); }] },
];

const director = { beat: -1, step: 0, auto: false, timer: 0 };

async function beat(n, step = 0) {
  const b = BEATS[Math.max(0, Math.min(BEATS.length - 1, n))];
  director.beat = BEATS.indexOf(b);
  director.step = Math.min(step, b.steps.length - 1);
  renderDots();
  await b.steps[director.step]();
}

async function nextStep() {
  const b = BEATS[director.beat];
  if (b && director.step < b.steps.length - 1) return beat(director.beat, director.step + 1);
  if (director.beat < BEATS.length - 1) return beat(director.beat + 1, 0);
}

function renderDots() {
  els.presenter.querySelector('.beats').innerHTML = BEATS.map((b, i) => `<button class="${i === director.beat ? 'on' : ''}" title="${i} · ${b.id}" data-beat="${i}"></button>`).join('');
}

function toggleAuto(on = !director.auto) {
  director.auto = on;
  document.body.classList.toggle('auto', on);
  clearTimeout(director.timer);
  if (!on) return;
  const tick = async () => {
    if (!director.auto) return;
    const b = BEATS[director.beat];
    const wait = (b?.auto[director.step] ?? 6) * 1000;
    director.timer = setTimeout(async () => {
      if (!director.auto) return;
      if (director.beat === BEATS.length - 1 && director.step === BEATS.at(-1).steps.length - 1) return toggleAuto(false);
      await nextStep();
      tick();
    }, wait);
  };
  if (director.beat < 0) beat(0).then(tick); else tick();
}

async function resetAll() {
  toggleAuto(false);
  S = (await api.reset()).snapshot;
  Object.assign(ui, { tab: 'today', seg: 'all', why: false, pay: 'idle', sheet: null, lock: false, splash: null, typing: false, pending: null, scroll: {} });
  els.lock.hidden = true;
  director.beat = -1;
  caption('');
  render();
  renderDots();
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.matches?.('input, textarea')) return;
  if (/^[0-9]$/.test(e.key)) { toggleAuto(false); const n = Number(e.key); return n === director.beat ? nextStep() : beat(n); }
  if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); toggleAuto(false); return nextStep(); }
  if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); toggleAuto(false); return beat(Math.max(0, director.beat - 1)); }
  if (e.key === 'a' || e.key === 'A') return toggleAuto();
  if (e.key === 'n' || e.key === 'N') return document.body.classList.toggle('captions');
  if (e.key === 'h' || e.key === 'H') return document.body.classList.toggle('clean');
  if (e.key === 'f' || e.key === 'F') return document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (e.key === 'R' && e.shiftKey) return resetAll();
  if (e.key === 'Escape') { ui.sheet = null; render(); }
}

// ---------------- boot ----------------
function fit() {
  const s = Math.min(1.12, (innerHeight - 96) / 870, (innerWidth - 40) / 420);
  document.documentElement.style.setProperty('--scale', String(Math.max(0.4, s)));
}

async function boot() {
  refs();
  installPhotoFallback();
  $('.stage-props').innerHTML = props.onion + props.book + props.spoon;
  $('.statusbar .right').innerHTML = icon.signal + icon.wifi + icon.battery;
  $('.stage-side').innerHTML = `${lockup({ tone: 'white', color: '#FFF6EC' })}<div class="tag">You are what you shop.</div><p class="small">Pantry is a Grok Bot that does the weekly shop. This is its app: the same conversation, cart and approvals, wherever you are.</p>`;
  fit();
  addEventListener('resize', fit);
  els.screen.addEventListener('click', onClick);
  els.screen.addEventListener('scroll', () => { els.screen.scrollTop = 0; els.screen.scrollLeft = 0; });
  els.scrim.addEventListener('click', () => { ui.sheet = null; render(); });
  els.presenter.addEventListener('click', e => { const b = e.target.closest('[data-beat]'); if (b) { toggleAuto(false); beat(Number(b.dataset.beat)); } });
  addEventListener('keydown', onKey);
  const params = new URLSearchParams(location.search);
  try {
    S = params.has('fresh') || params.has('auto') ? (await api.reset()).snapshot : await api.snapshot();
  } catch {
    document.body.innerHTML = '<p style="color:#fff;font:16px system-ui;padding:40px">Start the server: <code>npm run demo</code></p>';
    return;
  }
  if (params.has('tab')) ui.tab = params.get('tab');
  render();
  renderDots();
  if (params.has('beat')) await beat(Number(params.get('beat')));
  if (params.has('auto')) toggleAuto(true);
  window.pantry = { beat, nextStep, ui, get S() { return S; }, refresh };
}

boot();
