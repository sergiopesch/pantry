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
color:var(--t1);background:var(--bg);border:1px solid var(--ln);border-radius:8px;padding:20px 20px 18px;max-width:560px;
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
@media (max-width:420px){.pc{padding:16px}.pc .hero{font-size:46px}.pc .stats{grid-template-columns:1fr 1fr}.pc .stat:last-child{grid-column:1/-1}}
</style>`;

// Pantry's mark: the Grok dome in yellow with two eyes. Small, flat, no text.
const DOME = `<svg width="18" height="14" viewBox="0 0 114 82" aria-hidden="true"><path d="M0 82C0 36.7 25.5 0 57 0s57 36.7 57 82z" fill="${ACCENT}"/><rect x="34" y="36" width="12" height="22" rx="6" fill="#111"/><rect x="68" y="36" width="12" height="22" rx="6" fill="#111"/></svg>`;
const LANE_COLOURS = { everyone: 'var(--sand-dataviz-0,#1084FE)', vegan: 'var(--sand-dataviz-2,#00C972)', 'gluten-free': 'var(--sand-dataviz-3,#9159FE)', 'allergy-safe': ACCENT };
const NEED_COLOURS = ['var(--sand-dataviz-0,#1084FE)', 'var(--sand-dataviz-1,#00BCA6)', 'var(--sand-dataviz-2,#00C972)', 'var(--sand-dataviz-3,#9159FE)', 'var(--sand-dataviz-4,#FF309B)', 'var(--sand-dataviz-5,#936439)', 'var(--sand-dataviz-6,#777777)', 'var(--sand-dataviz-7,#FF263C)'];

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
${basis.length ? `<div class="sec"><p class="lbl">Turnout at the last ${basis.length} events</p><div class="cols" role="img" aria-label="${esc(basis.map(b => `${b.date} ${pct(b.rate)}`).join(', '))}">${cols}</div><div class="axis"><span>${esc(month(basis[0].date))}</span><span>${esc(month(basis.at(-1).date))}</span></div></div>` : ''}`;
  return {
    title: `Plan for ${h.planFor}, not ${h.signedUp}`,
    html: wrap('Headcount', body, h.overridden ? 'Your own number, not the forecast.' : ''),
    alt: `Plan for ${h.planFor}: ${h.signedUp} signed up, ${pct(h.showRate)} expected to come (${h.expected}), and ${h.criticalAt100} allergy or coeliac guests planned at 100%.`,
  };
}

function dietsCard(s) {
  const d = s.diets;
  const total = d.needs.reduce((n, x) => n + x.count, 0) || 1;
  const segs = d.needs.map((n, i) => `<i style="width:${share(n.count, total).toFixed(2)}%;background:${n.critical ? ACCENT : NEED_COLOURS[i % NEED_COLOURS.length]}"></i>`).join('');
  const keys = d.needs.map((n, i) => `<div class="key"><span class="sw" style="background:${n.critical ? ACCENT : NEED_COLOURS[i % NEED_COLOURS.length]}"></span>${esc(n.label)}${n.critical ? ' <span class="tag a">100%</span>' : ''}<b>${n.count}</b></div>`).join('');
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

function paymentCard(s, extra) {
  const a = extra?.approval ?? s.approval;
  if (!a) return { title: 'No payment requested', html: wrap('Payment', `<p class="hero">${gbp(0)}</p><p class="lede">No payment requested yet.</p>`), alt: 'No payment requested yet.' };
  const [label, tone] = PAY_STATUS[a.status] ?? [a.status, ''];
  const plates = s.plan?.chosen?.portions;
  const body = `<p class="hero">${gbp(a.amount)}</p>
<p class="lede">to <b>${esc(a.merchant)}</b> <span class="tag ${tone}">${esc(label)}</span></p>
<div class="rcpt">${plates ? `<span>Plates</span><b>${plates}</b>` : ''}<span>For</span><b>${esc(s.event?.name ?? a.memo ?? '')}</b><span>Request</span><b>${esc(a.id)}</b>${a.card ? `<span>Card</span><b>single-use ·${esc(a.card.last4)} · ${esc(a.card.state)}</b>` : '<span>Card</span><b>single-use, issued on approval</b>'}</div>`;
  const foot = a.status === 'pending' ? 'Pantry raised this. It cannot approve it. A human says yes.' : a.status === 'charged' ? 'Charged once. The card is dead.' : '';
  return {
    title: `${gbp(a.amount)} to ${a.merchant}: ${label}`,
    html: wrap('Payment', body, foot),
    alt: `Payment request ${a.id}: ${gbp(a.amount)} to ${a.merchant}, ${label.toLowerCase()}.`,
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

const KINDS = { headcount: headcountCard, diets: dietsCard, options: optionsCard, plan: planCard, inbox: inboxCard, payment: paymentCard, debrief: debriefCard, memory: memoryCard };
export const CARD_KINDS = Object.keys(KINDS);

// card('plan', eventSnapshot(world, state)); options needs extra.options (eventOptions), debrief needs the
// debrief() result as extra, memory needs extra { finding, date }.
export function card(kind, snapshot = {}, extra) {
  const make = KINDS[kind];
  if (!make) throw new Error(`No card "${kind}". Try one of: ${CARD_KINDS.join(', ')}.`);
  return { kind, ...make(snapshot, extra) };
}
