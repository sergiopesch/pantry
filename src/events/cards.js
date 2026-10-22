// Pantry's visual answers. Each card is one idea: a big number first, a bar where length carries the
// quantity, and a plain-text `alt` for when a picture can't be shown. The html is a self-contained
// fragment for Grok Bot's Visualize tool. It uses the host's --sand-* theme variables (with dark
// fallbacks), so it sits right in light and dark Grok. There are no scripts, no external assets,
// no italics, no pills and no arrowheads.
import { clock, longDate, round2 } from '../util.js';
import { LANES } from './plan.js';

const ACCENT = '#FF9800';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const gbp = n => `£${round2(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const gbp0 = n => (Number.isInteger(round2(n)) ? `£${round2(n).toLocaleString('en-GB')}` : gbp(n));
const pct = n => `${Math.round(n * 100)}%`;
const share = (a, b) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0);

const STYLE = `<style>
.pc{--a:${ACCENT};--t1:var(--sand-text-primary,#f5f5f5);--t2:var(--sand-text-secondary,#f5f5f5a8);--t3:var(--sand-text-tertiary,#f5f5f570);
--bg:var(--sand-bg-elevated,#161616);--bg2:var(--sand-bg-secondary,#ffffff0d);--ln:var(--sand-border-tertiary-translucent,#ffffff14);
--ok:var(--sand-text-success-primary,#00C972);--warn:var(--sand-text-warn-primary,#FF9800);--bad:var(--sand-text-danger-primary,#FF263C);
font-family:var(--cursor-font-family-sans,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif);
color:var(--t1);background:var(--bg);border:1px solid var(--ln);border-radius:8px;padding:18px 20px 16px;max-width:560px;
box-sizing:border-box;font-style:normal;font-variant-numeric:tabular-nums;line-height:1.35;-webkit-font-smoothing:antialiased}
.pc *{box-sizing:border-box;font-style:normal}
.pc .hd{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.02em;color:var(--t2);margin:0 0 14px}
.pc .hd svg{flex:none}
.pc .hero{font-size:56px;line-height:1;font-weight:700;letter-spacing:-.03em;margin:0}
.pc .hero .u{font-size:22px;font-weight:600;letter-spacing:-.01em;color:var(--t2);margin-left:6px}
.pc .lede{font-size:15px;color:var(--t2);margin:8px 0 0}
.pc .lede b{color:var(--t1);font-weight:600}
.pc .sec{margin-top:18px}
.pc .lbl{font-size:12px;color:var(--t3);margin:0 0 8px}
.pc .row{display:grid;grid-template-columns:minmax(84px,30%) 1fr auto;align-items:center;gap:10px;margin:7px 0;font-size:13px}
.pc .row .n{color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .row .v{font-weight:600;text-align:right;white-space:nowrap}
.pc .bar{height:10px;border-radius:3px;background:var(--bg2);overflow:hidden}
.pc .bar i{display:block;height:100%;border-radius:3px;background:var(--a)}
.pc .bar i.mute{background:var(--t3)}
.pc .stack{display:flex;height:14px;border-radius:3px;overflow:hidden;background:var(--bg2);gap:2px}
.pc .stack i{display:block;height:100%}
.pc .keys{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px;margin-top:10px;font-size:13px}
.pc .key{display:flex;align-items:center;gap:8px;color:var(--t2)}
.pc .key b{color:var(--t1);font-weight:600;margin-left:auto}
.pc .sw{width:10px;height:10px;border-radius:2px;flex:none}
.pc .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.pc .stat{background:var(--bg2);border-radius:6px;padding:10px 12px}
.pc .stat b{display:block;font-size:22px;font-weight:700;letter-spacing:-.02em}
.pc .stat span{font-size:12px;color:var(--t2)}
.pc .cols{display:flex;align-items:flex-end;gap:4px;height:56px}
.pc .cols i{flex:1;background:var(--t3);border-radius:2px 2px 0 0;min-height:2px}
.pc .cols i.on{background:var(--a)}
.pc .axis{display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-top:4px}
.pc .tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;background:var(--bg2);color:var(--t2);vertical-align:2px}
.pc .tag.a{background:var(--a);color:#000}
.pc .tag.ok{color:var(--ok)}
.pc .tag.bad{color:var(--bad)}
.pc .opt{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:10px 0;border-top:1px solid var(--ln)}
.pc .opt:first-of-type{border-top:0}
.pc .opt .nm{font-size:14px;font-weight:600}
.pc .opt .pr{font-size:14px;font-weight:600;text-align:right}
.pc .opt .why{grid-column:1/-1;font-size:12px;color:var(--t2)}
.pc .opt.out .nm,.pc .opt.out .pr{color:var(--t3);font-weight:500}
.pc .opt .bar{grid-column:1/-1;height:6px;margin-top:4px}
.pc .list{margin:0;padding:0;list-style:none}
.pc .list li{padding:10px 0;border-top:1px solid var(--ln);font-size:14px}
.pc .list li:first-child{border-top:0}
.pc .list li span{display:block;font-size:12px;color:var(--t2);margin-top:3px}
.pc .quote{font-size:20px;line-height:1.35;font-weight:600;letter-spacing:-.01em;margin:0;padding-left:14px;border-left:3px solid var(--a)}
.pc .ft{margin-top:16px;font-size:12px;color:var(--t3)}
.pc .ft b{color:var(--t2);font-weight:600}
.pc .rcpt{display:grid;grid-template-columns:1fr auto;gap:8px 12px;font-size:14px;margin-top:16px;padding-top:14px;border-top:1px dashed var(--ln)}
.pc .rcpt span{color:var(--t2)}
.pc .rcpt b{font-weight:600;text-align:right}
.pc .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.pc .chip{font-size:10px;font-weight:600;padding:1px 5px;border-radius:4px;background:var(--bg2);color:var(--t2);letter-spacing:.01em}
.pc .chip.crit{background:var(--a);color:#000}
.pc .dish{display:flex;align-items:center;gap:4px 10px;padding:4px 0;border-top:1px solid var(--ln);font-size:13.5px}
.pc .dish:first-of-type{border-top:0}
.pc .dish .nm{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;flex:1;min-width:0}
.pc .dish .chips{margin:0}
.pc .dish .pr{font-weight:600;white-space:nowrap}
.pc .top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.pc .top .name{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0;line-height:1.1}
.pc .mini{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}
.pc .mini div{background:var(--bg2);border-radius:6px;padding:7px 9px;font-size:11px;color:var(--t2)}
.pc .mini b{display:block;font-size:15px;color:var(--t1);font-weight:700}
.pc .total{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:12px;padding-top:10px;border-top:1px dashed var(--ln);font-size:13px;color:var(--t2)}
.pc .total b{font-size:24px;color:var(--t1);font-weight:700;letter-spacing:-.02em}
.pc .more{font-size:12px;color:var(--t3);padding-top:6px}
.pc .verdict{font-size:15px;font-weight:700;margin:0;white-space:nowrap}
.pc .verdict.ok{color:var(--ok)}
.pc .verdict.bad{color:var(--bad)}
.pc .src{font-size:12px;color:var(--t3);margin:-8px 0 12px}
.pc .item{display:grid;grid-template-columns:auto 1fr auto;gap:0 10px;align-items:baseline;padding:3px 0;font-size:13px}
.pc .item .q{color:var(--t2);font-weight:600;min-width:28px}
.pc .item .t{font-weight:600;text-align:right;white-space:nowrap}
.pc .item .chips{grid-column:2/-1;margin-top:2px}
.pc .lane{font-size:11.5px;color:var(--t3);margin:8px 0 1px;padding-top:7px;border-top:1px solid var(--ln)}
.pc .lane:first-child{border-top:0;padding-top:0;margin-top:0}
.pc .sum{display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-size:13px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--ln)}
.pc .sum span{color:var(--t2)}
.pc .sum b{text-align:right;font-weight:600}
.pc .sum .tot{font-size:18px;color:var(--t1);font-weight:700}
.pc .track{display:grid;grid-template-columns:repeat(3,1fr);margin-top:18px;position:relative}
.pc .track::before{content:"";position:absolute;left:8px;right:8px;top:7px;height:2px;background:var(--ln)}
.pc .track .fill{position:absolute;left:8px;top:7px;height:2px;background:var(--a)}
.pc .step{position:relative;font-size:12px;color:var(--t3);padding-top:24px}
.pc .step::before{content:"";position:absolute;top:0;left:0;width:16px;height:16px;border-radius:50%;background:var(--bg);border:2px solid var(--ln);box-sizing:border-box}
.pc .step.done::before{background:var(--a);border-color:var(--a)}
.pc .step.now::before{border-color:var(--a)}
.pc .step.done,.pc .step.now{color:var(--t1)}
.pc .step b{display:block;font-weight:600;font-size:12.5px}
.pc .step:nth-child(3){text-align:center}.pc .step:nth-child(3)::before{left:calc(50% - 8px)}
.pc .step:nth-child(4){text-align:right}.pc .step:nth-child(4)::before{left:auto;right:0}
.pc.c .hd{margin-bottom:10px}
@media (max-width:420px){.pc .mini{grid-template-columns:1fr 1fr}.pc .top .name{font-size:21px}.pc{padding:16px}.pc .hero{font-size:46px}.pc .stats{grid-template-columns:1fr 1fr}.pc .stat:last-child{grid-column:1/-1}}
</style>`;

// Pantry's mark: the Grok dome in yellow with two eyes, wearing a small white chef's toque.
const DOME = `<svg width="16" height="18" viewBox="0 0 114 128" aria-hidden="true"><g fill="#fff" stroke="#0000002e" stroke-width="3"><path d="M30 46a17 17 0 0 1 8-32 21 21 0 0 1 38 0 17 17 0 0 1 8 32z"/><rect x="33" y="40" width="48" height="14" rx="3"/></g><path d="M0 128C0 82.7 25.5 46 57 46s57 36.7 57 82z" fill="${ACCENT}"/><rect x="34" y="82" width="12" height="22" rx="6" fill="#111"/><rect x="68" y="82" width="12" height="22" rx="6" fill="#111"/></svg>`;
const LANE_COLOURS = { everyone: 'var(--sand-dataviz-0,#1084FE)', vegan: 'var(--sand-dataviz-2,#00C972)', 'gluten-free': 'var(--sand-dataviz-3,#9159FE)', 'allergy-safe': ACCENT };
// One fixed colour per need, so a need looks the same on every card. The critical ones share Pantry's yellow.
const NEED_COLOURS = {
  vegan: 'var(--sand-dataviz-2,#00C972)', vegetarian: 'var(--sand-dataviz-3,#9159FE)', pescatarian: 'var(--sand-dataviz-1,#00BCA6)',
  halal: 'var(--sand-dataviz-0,#1084FE)', 'gluten-free': 'var(--sand-dataviz-4,#FF309B)', 'dairy-free': 'var(--sand-dataviz-5,#936439)', 'no-pork': 'var(--sand-dataviz-6,#777777)',
};
const needColour = n => (n.critical ? ACCENT : NEED_COLOURS[n.id] ?? 'var(--sand-dataviz-6,#777777)');

const wrap = (label, body, foot = '') => `${STYLE}<section class="pc" role="group" aria-label="${esc(label)}"><p class="hd">${DOME}<span>Pantry · ${esc(label)}</span></p>${body}${foot ? `<p class="ft">${foot}</p>` : ''}</section>`;
const bar = (pctWidth, mute = false) => `<div class="bar"><i class="${mute ? 'mute' : ''}" style="width:${pctWidth.toFixed(1)}%"></i></div>`;
const row = (name, value, pctWidth, mute) => `<div class="row"><span class="n">${esc(name)}</span>${bar(pctWidth, mute)}<span class="v">${esc(value)}</span></div>`;
const month = d => new Date(`${d}T12:00:00Z`).toLocaleString('en-GB', { month: 'short' });

function headcountCard(s) {
  const h = s.headcount;
  const basis = h.basis ?? [];
  const cols = basis.map(b => `<i class="${b.weight >= 2 ? 'on' : ''}" style="height:${Math.max(4, b.rate * 100).toFixed(0)}%" title="${esc(`${b.date}: ${b.attended} of ${b.signedUp}`)}"></i>`).join('');
  const body = `<p class="hero">${h.planFor}<span class="u">to plan for</span></p>
<p class="lede"><b>${h.signedUp}</b> signed up. Past events point to <b>${pct(h.showRate)}</b> turning up.</p>
<div class="sec">${row('Signed up', h.signedUp, 100, true)}${row('Expected', h.expected, share(h.expected, h.signedUp), true)}${row('Plan for', h.planFor, share(h.planFor, h.signedUp))}</div>
<div class="stats"><div class="stat"><b>${pct(h.showRate)}</b><span>show rate</span></div><div class="stat"><b>${h.expected}</b><span>expected</span></div><div class="stat"><b>${h.criticalAt100}</b><span>allergy or coeliac, planned at 100%</span></div></div>
${basis.length ? `<div class="sec"><p class="lbl">Turnout at the last ${basis.length} events · events like this one in yellow</p><div class="cols" role="img" aria-label="${esc(basis.map(b => `${b.date} ${pct(b.rate)}`).join(', '))}">${cols}</div><div class="axis"><span>${esc(month(basis[0].date))}</span><span>${esc(month(basis.at(-1).date))}</span></div></div>` : ''}`;
  return {
    title: `Plan for ${h.planFor}, not ${h.signedUp}`,
    html: wrap('Headcount', body, h.overridden ? 'Your own number, not the forecast.' : ''),
    alt: `Plan for ${h.planFor}: ${h.signedUp} signed up, ${pct(h.showRate)} expected to come (${h.expected}), and ${h.criticalAt100} allergy or coeliac guests planned at 100%.`,
  };
}

function dietsCard(s) {
  const d = s.diets;
  const total = d.needs.reduce((n, x) => n + x.count, 0) || 1;
  const segs = d.needs.map(n => `<i style="width:${share(n.count, total).toFixed(2)}%;background:${needColour(n)}"></i>`).join('');
  const keys = d.needs.map(n => `<div class="key"><span class="sw" style="background:${needColour(n)}"></span>${esc(n.label)}${n.critical ? ' <span class="tag a">100%</span>' : ''}<b>${n.count}</b></div>`).join('');
  const body = `<p class="hero">${d.declared}<span class="u">of ${d.signedUp} declared a need</span></p>
<p class="lede">Every one gets a safe plate. Allergies and coeliac are planned for everyone who signed up.</p>
<div class="sec"><div class="stack" role="img" aria-label="${esc(d.needs.map(n => `${n.label} ${n.count}`).join(', '))}">${segs}</div><div class="keys">${keys}</div></div>`;
  return {
    title: `${d.declared} declared needs`,
    html: wrap('Diets', body, 'Only what guests declared on Luma. Nothing inferred.'),
    alt: `${d.declared} of ${d.signedUp} declared a need: ${d.needs.map(n => `${n.count} ${n.label.toLowerCase()}`).join(', ')}.`,
  };
}

function optionsCard(s, extra) {
  const all = extra?.options ?? s.options ?? [];
  const budget = s.event?.budget?.total ?? s.plan?.budget?.total ?? Math.max(...all.map(o => o.cost.total));
  const max = Math.max(budget, ...all.map(o => o.cost.total));
  const ins = all.filter(o => o.eligible);
  const outs = all.filter(o => !o.eligible);
  const opt = (o, i) => `<div class="opt${o.eligible ? '' : ' out'}"><span class="nm">${esc(o.name)} ${o.eligible ? (i === 0 ? '<span class="tag a">Pick</span>' : '') : '<span class="tag bad">Out</span>'}</span><span class="pr">${gbp(o.cost.total)}</span>${bar(share(o.cost.total, max), !o.eligible)}<span class="why">${esc(o.eligible ? `${o.tier} · ${gbp(o.cost.perExpected)} a head${o.record?.ranOut?.length ? ` · ${o.record.ranOut.join(' and ')} ran out before` : ''}` : o.excluded[0])}</span></div>`;
  const body = `<p class="hero">${ins.length}<span class="u">of ${all.length} can feed everyone safely</span></p>
<p class="lede">Budget <b>${gbp0(budget)}</b>. ${outs.length} out, each for a reason.</p>
<div class="sec">${[...ins, ...outs].slice(0, 8).map(opt).join('')}</div>`;
  return {
    title: `${ins.length} of ${all.length} options are safe`,
    html: wrap('Options', body),
    alt: `${ins.length} of ${all.length} providers can feed everyone safely: ${ins.map(o => `${o.name} ${gbp(o.cost.total)}`).join(', ')}. Out: ${outs.map(o => `${o.name} (${o.excluded[0]})`).join('; ')}.`,
  };
}

function planCard(s) {
  const p = s.plan;
  if (!p?.chosen) return { title: 'No safe plan yet', html: wrap('Plan', `<p class="hero">0<span class="u">safe options</span></p><p class="lede">${esc(p?.text ?? 'Nothing fits yet.')}</p>`), alt: p?.text ?? 'No safe plan yet.' };
  const c = p.chosen;
  const lanes = p.lanes ?? Object.keys(LANES).map(id => ({ id, label: LANES[id], portions: c.lines.filter(l => l.lane === id).reduce((n, l) => n + l.qty, 0) })).filter(l => l.portions);
  const plates = lanes.reduce((n, l) => n + l.portions, 0) || 1;
  const segs = lanes.map(l => `<i style="width:${share(l.portions, plates).toFixed(2)}%;background:${LANE_COLOURS[l.id]}"></i>`).join('');
  const keys = lanes.map(l => `<div class="key"><span class="sw" style="background:${LANE_COLOURS[l.id]}"></span>${esc(l.label)}<b>${l.portions}</b></div>`).join('');
  const b = p.budget;
  const body = `<p class="hero">${gbp(c.cost.total)}</p>
<p class="lede"><b>${esc(c.name)}</b>, ${c.portions} plates, ${gbp(c.cost.perExpected)} a head. Lands by <b>${esc(clock(c.dropAt))}</b>.</p>
<div class="sec"><p class="lbl">Against the ${gbp0(b.total)} budget · ${b.left >= 0 ? `${gbp(b.left)} left` : `${gbp(-b.left)} over`}</p>${bar(share(b.spend, b.total))}</div>
<div class="sec"><p class="lbl">Plates by lane</p><div class="stack" role="img" aria-label="${esc(lanes.map(l => `${l.label} ${l.portions}`).join(', '))}">${segs}</div><div class="keys">${keys}</div></div>`;
  return {
    title: `${c.name}: ${gbp(c.cost.total)}`,
    html: wrap('The plan', body, c.cost.quoted ? 'Quoted price.' : 'Estimate until the provider quotes.'),
    alt: `${c.name}: ${c.portions} plates for ${gbp(c.cost.total)} (${gbp(c.cost.perExpected)} a head), ${b.left >= 0 ? `${gbp(b.left)} under` : `${gbp(-b.left)} over`} the ${gbp0(b.total)} budget, landing by ${clock(c.dropAt)}. Lanes: ${lanes.map(l => `${l.portions} ${l.label.toLowerCase()}`).join(', ')}.`,
  };
}

function inboxCard(s) {
  const i = s.inbox;
  const quiet = i.items.length - i.needsYou.length;
  const body = `<p class="hero">${i.needsYou.length}<span class="u">need${i.needsYou.length === 1 ? 's' : ''} you</span></p>
<p class="lede">${i.items.length} emails in. <b>${quiet}</b> handled quietly.</p>
<div class="sec"><ul class="list">${i.needsYou.map(n => `<li>${esc(n.subject)}<span>${esc(n.note)}</span></li>`).join('')}</ul></div>`;
  return {
    title: `${i.needsYou.length} need you`,
    html: wrap('Inbox', body, i.address ? `Pantry's own address: <b>${esc(i.address)}</b>` : ''),
    alt: `${i.items.length} emails, ${quiet} handled quietly, ${i.needsYou.length} need you: ${i.needsYou.map(n => n.subject).join('; ')}.`,
  };
}

const PAY_STATUS = {
  pending: ['Needs your approval', 'a'], approved: ['Approved', 'ok'], charged: ['Paid', 'ok'],
  declined: ['Declined', 'bad'], void: ['Void: the plan changed', 'bad'], expired: ['Expired', 'bad'], superseded: ['Replaced by a newer request', ''],
};

// Never a card number: keep the last four digits of anything that looks like one.
const maskCard = c => {
  if (!c) return null;
  if (typeof c === 'object') return c.last4 ? `${c.brand ? `${c.brand} ` : ''}•••• ${String(c.last4).slice(-4)}` : null;
  const digits = String(c).replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : String(c).replace(/\d/g, '•');
};
const PROCESSOR = { agentcard: 'Agentcard · single-use card', stripe: 'Stripe payment link', link: 'Link' };

function paymentCard(s, extra) {
  const a = extra?.approval ?? s.approval;
  if (!a) return { title: 'No payment requested', html: wrap('Payment', `<p class="hero">${gbp(0)}</p><p class="lede">No payment requested yet.</p>`), alt: 'No payment requested yet.' };
  const pay = a.payment ?? null;
  const paid = a.status === 'charged' || pay?.status === 'paid';
  const approved = paid || a.status === 'approved' || ['awaiting-settlement', 'approved', 'authorised', 'authorized'].includes(pay?.status);
  const stopped = ['declined', 'void', 'expired', 'superseded'].includes(a.status);
  const [label, tone] = stopped ? (PAY_STATUS[a.status] ?? [a.status, 'bad']) : paid ? ['Paid', 'ok'] : approved ? ['Approved, settling', 'ok'] : ['Needs your approval', 'a'];
  const done = 1 + (approved ? 1 : 0) + (paid ? 1 : 0); // steps completed; the next one is current
  const at = done - 1;
  const steps = [['Requested', 'by Pantry'], ['Approved by you', 'Face ID'], ['Paid', 'card closed']];
  const track = stopped ? '' : `<div class="track" role="list" aria-label="Payment progress"><span class="fill" style="width:${['0px', 'calc(50% - 8px)', 'calc(100% - 16px)'][at]}"></span>${steps.map(([t, sub], i) => `<div role="listitem" class="step ${i < done ? 'done' : i === done ? 'now' : ''}"><b>${esc(t)}</b>${esc(sub)}</div>`).join('')}</div>`;
  const processor = pay ? `${PROCESSOR[pay.processor] ?? pay.processor}${pay.sandbox ? ' · sandbox' : ''}` : 'single-use card, issued on approval';
  const masked = maskCard(pay?.card) ?? (a.card?.last4 ? `•••• ${a.card.last4}` : null);
  const plates = s.plan?.chosen?.portions;
  const body = `<p class="hero">${gbp(a.amount)}</p>
<p class="lede">to <b>${esc(a.merchant)}</b> <span class="tag ${tone}">${esc(label)}</span></p>
${track}
<div class="rcpt">${plates ? `<span>Plates</span><b>${plates}</b>` : ''}<span>For</span><b>${esc(s.event?.name ?? a.memo ?? '')}</b><span>Processor</span><b>${esc(processor)}</b>${masked ? `<span>Card</span><b>${esc(masked)}${paid ? ' · closed' : ''}</b>` : ''}${pay?.reference ? `<span>Reference</span><b>${esc(pay.reference)}</b>` : `<span>Request</span><b>${esc(a.id)}</b>`}</div>`;
  const foot = stopped ? '' : paid ? 'Charged once. The single-use card is closed.' : approved ? 'Approved. Waiting for the processor to settle.' : 'Pantry raised this. It cannot approve it. A human says yes.';
  return {
    title: `${gbp(a.amount)} to ${a.merchant}: ${label}`,
    html: wrap('Payment', body, foot),
    alt: `Payment ${pay?.reference ?? a.id}: ${gbp(a.amount)} to ${a.merchant} via ${processor}, ${label.toLowerCase()}.`,
  };
}

function debriefCard(s, extra) {
  const r = extra?.record ? extra : null;
  if (!r) return { title: 'No debrief yet', html: wrap('Debrief', `<p class="hero">0<span class="u">debriefs</span></p><p class="lede">After the event, tell Pantry who came.</p>`), alt: 'No debrief recorded yet.' };
  const { record: e, learnings } = r;
  const body = `<p class="hero">${e.attended}<span class="u">of ${e.signedUp} came</span></p>
<p class="lede">${pct(e.attended / e.signedUp)} turnout · ${pct(e.leftoverPct)} left over · rated ${Number(e.rating).toFixed(1)}</p>
<div class="sec">${row('Ordered for', e.orderedFor, 100, true)}${row('Came', e.attended, share(e.attended, e.orderedFor))}</div>
<div class="sec"><p class="lbl">What changes next time</p><ul class="list">${learnings.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
  return {
    title: `${e.attended} came`,
    html: wrap('Debrief', body, `Show rate is now <b>${pct(r.showRate)}</b>.`),
    alt: `${e.attended} of ${e.signedUp} came. ${learnings.join(' ')}`,
  };
}

function memoryCard(s, extra = {}) {
  const finding = extra.finding ?? 'Nothing on file.';
  const date = extra.date ? (/^\d{4}-\d{2}-\d{2}/.test(extra.date) ? longDate(`${extra.date.slice(0, 10)}T12:00:00Z`) : extra.date) : null;
  const body = `<p class="quote">${esc(finding)}</p>`;
  return {
    title: date ? `From memory: ${date}` : 'From memory',
    html: wrap('Memory', body, `${date ? `<b>${esc(date)}</b> · ` : ''}From Cognee, dataset ${esc(extra.dataset ?? 'pantry-events')}`),
    alt: `${date ? `${date}: ` : ''}${finding}`,
  };
}


const CHIP_TAGS = ['vegan', 'vegetarian', 'gluten-free', 'coeliac-safe', 'nut-free', 'sealed', 'halal', 'dairy-free'];
const CHIP_LABEL = { 'gluten-free': 'GF', 'coeliac-safe': 'coeliac-safe', 'nut-free': 'nut-free', 'dairy-free': 'dairy-free' };
const chips = tags => {
  const t = CHIP_TAGS.filter(x => (tags ?? []).includes(x));
  return t.length ? `<span class="chips">${t.map(x => `<span class="chip${x === 'coeliac-safe' || x === 'sealed' ? ' crit' : ''}">${esc(CHIP_LABEL[x] ?? x)}</span>`).join('')}</span>` : '';
};
const domain = src => {
  try {
    return new URL(src).hostname.replace(/^www\./, '');
  } catch {
    return src ? String(src) : null;
  }
};
const hhmm = d => {
  if (!d || Number.isNaN(new Date(d).getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d));
};
const hoursLabel = h => (h == null ? 'n/a' : h >= 48 && h % 24 === 0 ? `${h / 24} days` : `${h} h`);
const TIER = { supermarket: 'Supermarket', caterer: 'Caterer', restaurant: 'Restaurant' };

function providerCard(s, extra = {}) {
  const o = extra.option;
  if (!o) throw new Error('The provider card needs extra.option (one entry from pantry_options).');
  const raw = extra.provider ?? {};
  const seen = new Map();
  for (const d of raw.dishes ?? o.dishes ?? o.lines ?? []) if (!seen.has(d.name)) seen.set(d.name, { name: d.name, price: d.price, tags: d.tags ?? [] });
  const dishes = [...seen.values()];
  const shown = dishes.slice(0, 6);
  const src = raw.source ?? o.source;
  const checked = hhmm(raw.checkedAt ?? o.checkedAt);
  const reviews = raw.reviews ?? o.reviews;
  const f = raw.fulfilment ?? o.fulfilment ?? {};
  const minOrder = raw.minOrder ?? o.minOrder;
  const safeAll = o.eligible;
  const reason = safeAll ? (o.addons?.length ? `Allergy-safe plates sealed, from ${o.addons.map(a => a.name).join(' and ')}` : 'Every declared need has a safe plate') : o.excluded[0];
  const srcLine = [/^https?:/.test(src ?? '') ? domain(src) : src === 'estimate' ? 'estimated prices' : null, checked ? `checked ${checked}` : null, o.live ? 'live' : null].filter(Boolean).join(' · ');
  const body = `<div class="top"><p class="name">${esc(raw.name ?? o.name)}</p><p class="verdict ${safeAll ? 'ok' : 'bad'}">${safeAll ? 'Safe for everyone' : 'Out'}</p></div>
<p class="src" style="margin:4px 0 0">${esc(TIER[o.tier] ?? o.tier)}${srcLine ? ` · ${esc(srcLine)}` : ''}</p>
${safeAll && !o.addons?.length ? '' : `<p class="lede" style="margin-top:6px;font-size:14px">${esc(reason)}</p>`}
<div class="sec" style="margin-top:8px">${shown.map(d => `<div class="dish"><span class="nm"><span>${esc(d.name)}</span>${chips(d.tags)}</span><span class="pr">${gbp(d.price)}</span></div>`).join('')}${dishes.length > shown.length ? `<p class="more">+${dishes.length - shown.length} more</p>` : ''}</div>
<div class="mini"><div><b>${f.fee ? gbp(f.fee) : 'Free'}</b>${esc(f.type === 'collection' ? 'collection' : 'delivery')}</div><div><b>${esc(hoursLabel(f.leadHours))}</b>notice</div><div><b>${minOrder ? gbp0(minOrder) : 'None'}</b>minimum</div><div><b>${reviews?.rating ? Number(reviews.rating).toFixed(1) : 'n/a'}</b>${reviews?.rating ? `${Number(reviews.count ?? 0).toLocaleString('en-GB')} reviews` : 'no reviews'}</div></div>
<div class="total"><span>Total for ${o.portions} · ${gbp(o.cost.perExpected)} a head</span><b>${gbp(o.cost.total)}</b></div>`;
  return {
    title: `${o.name}: ${safeAll ? 'safe for everyone' : 'out'}`,
    html: wrap(TIER[o.tier] ?? 'Provider', body, o.cost.quoted ? 'Quoted price.' : o.live ? 'Prices read from their site; confirm before paying.' : 'Estimate.'),
    alt: `${o.name} (${o.tier}${srcLine ? `, ${srcLine}` : ''}): ${safeAll ? 'safe for everyone' : `out, ${o.excluded[0]}`}. ${o.portions} plates for ${gbp(o.cost.total)}, ${gbp(o.cost.perExpected)} a head.${reviews?.rating ? ` Rated ${reviews.rating} from ${reviews.count} reviews.` : ''}`,
  };
}

function orderCard(s, extra = {}) {
  const p = extra.plan ?? s.plan;
  const c = p?.chosen;
  if (!c) return { title: 'No order yet', html: wrap('Order', `<p class="hero">0<span class="u">lines</span></p><p class="lede">No plan to order yet.</p>`), alt: 'No order yet.' };
  const approval = extra.approval ?? s.approval;
  const groups = Object.keys(LANES).map(id => ({ id, label: LANES[id], lines: c.lines.filter(l => l.lane === id) })).filter(g => g.lines.length);
  const tag = l => (l.provider && l.provider !== c.id && l.providerName ? `<span class="chips"><span class="chip crit">from ${esc(l.providerName)}</span></span>` : '');
  const items = groups.map(g => `<p class="lane">${esc(g.label)} · ${g.lines.reduce((n, l) => n + l.qty, 0)}</p>${g.lines.map(l => `<div class="item"><span class="q">${l.qty}×</span><span>${esc(l.name)}</span><span class="t">${gbp(l.qty * l.price)}</span>${tag(l)}</div>`).join('')}`).join('');
  const left = round2(p.budget.total - c.cost.total);
  const body = `<p class="hero" style="font-size:40px">${c.portions}<span class="u" style="font-size:17px">plates · ${esc(c.name)}</span></p>
<div class="sec" style="margin-top:12px">${items}</div>
<div class="sum"><span>Food</span><b>${gbp(c.cost.food)}</b>${c.cost.extras ? `<span>Drinks and extras</span><b>${gbp(c.cost.extras)}</b>` : ''}<span>Delivery${c.addons?.length ? ` (${c.addons.length + 1} drops)` : ''}</span><b>${c.cost.fee ? gbp(c.cost.fee) : 'Free'}</b><span class="tot">Total</span><b class="tot">${gbp(c.cost.total)}</b><span>Budget left</span><b>${left >= 0 ? gbp(left) : `${gbp(-left)} over`}</b></div>`;
  return {
    title: `Order: ${c.portions} plates, ${gbp(c.cost.total)}`,
    html: wrap('Your order', body, approval?.status === 'charged' ? 'Paid.' : 'Nothing is ordered until you approve the payment.'),
    alt: `Order with ${c.name}: ${groups.map(g => `${g.label} ${g.lines.map(l => `${l.qty} × ${l.name}`).join(', ')}`).join('; ')}. Total ${gbp(c.cost.total)}, ${left >= 0 ? `${gbp(left)} left` : `${gbp(-left)} over`} of ${gbp0(p.budget.total)}.`,
  };
}

const KINDS = { headcount: headcountCard, diets: dietsCard, options: optionsCard, provider: providerCard, plan: planCard, order: orderCard, inbox: inboxCard, payment: paymentCard, debrief: debriefCard, memory: memoryCard };
export const CARD_KINDS = Object.keys(KINDS);

// card('plan', eventSnapshot(world, state)). options needs extra.options (eventOptions); provider needs
// extra.option (one of them) and optionally extra.provider (the raw provider); order takes { plan, approval };
// debrief needs the debrief() result as extra; memory needs extra { finding, date }.
export function card(kind, snapshot = {}, extra) {
  const make = KINDS[kind];
  if (!make) throw new Error(`No card "${kind}". Try one of: ${CARD_KINDS.join(', ')}.`);
  return { kind, ...make(snapshot, extra) };
}
