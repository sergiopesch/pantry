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
html,body,main{margin:0!important;padding:0!important;background:transparent!important;border:0!important}
body{overflow:hidden}
.pc{--a:${ACCENT};--t1:#F5F5F5;--t2:#B8B8B8;--t3:#8A8A8A;--bg:#141414;--bg2:#222222;--bg3:#2C2C2C;--ln:#2A2A2A;
--ok:#3DDC97;--bad:#FF5A6A;display:block;width:100%;max-width:600px;margin:0;color-scheme:dark;
font-family:var(--cursor-font-family-sans,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif);
font-size:14px;color:var(--t1);background:var(--bg);border:0;border-radius:16px;overflow:hidden;padding:24px;box-sizing:border-box;font-style:normal;
font-variant-numeric:tabular-nums;line-height:1.4;-webkit-font-smoothing:antialiased;text-wrap:pretty}
.pc *{box-sizing:border-box;font-style:normal}
.pc p{margin:0}
.pc .hd{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--t3);margin:0 0 16px}
.pc .hd svg{flex:none;overflow:visible}
.pc .hat{transform-box:fill-box;transform-origin:50% 100%;animation:pc-hat .5s ease-out .15s both}
.pc .hero{font-size:56px;line-height:1;font-weight:700;letter-spacing:-.03em;margin:0;animation:pc-land .5s cubic-bezier(.2,.8,.2,1) both;text-wrap:balance}
.pc .hero .u{font-size:20px;font-weight:600;letter-spacing:-.01em;color:var(--t2);margin-left:8px}
.pc .lede{font-size:15px;color:var(--t2);margin-top:8px;animation:pc-in .4s ease-out .1s both}
.pc .lede b{color:var(--t1);font-weight:600}
.pc .sec{margin-top:24px}
.pc .lbl{font-size:12px;font-weight:500;color:var(--t3);margin:0 0 8px}
.pc .row{display:grid;grid-template-columns:96px 1fr 48px;align-items:center;gap:8px 16px;padding:4px 0;font-size:14px}
.pc .row .n{color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc .row .v{font-weight:600;text-align:right}
.pc .bar{height:8px;border-radius:2px;background:var(--bg2);overflow:hidden}
.pc .bar i{display:block;height:100%;border-radius:2px;background:var(--a);transform-origin:0 50%;animation:pc-grow .6s cubic-bezier(.2,.8,.2,1) .25s both}
.pc .bar i.mute{background:#5A5A5A}
.pc .stack{display:flex;height:16px;border-radius:2px;overflow:hidden;background:var(--bg2);gap:2px;transform-origin:0 50%;animation:pc-grow .6s cubic-bezier(.2,.8,.2,1) .25s both}
.pc .stack i{display:block;height:100%}
.pc .keys{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px 24px;margin-top:16px;font-size:13px}
.pc .key{display:flex;align-items:center;gap:8px;color:var(--t2);min-width:0}
.pc .key b{color:var(--t1);font-weight:600;margin-left:auto}
.pc .sw{width:10px;height:10px;border-radius:2px;flex:none}
.pc .note{display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 12px;background:var(--bg2);border-radius:6px;font-size:13px;color:var(--t2);animation:pc-in .4s ease-out .5s both}
.pc .note b{color:var(--t1)}
.pc .note .dot{width:8px;height:8px;border-radius:2px;background:var(--a);flex:none}
.pc .cols{display:flex;align-items:flex-end;gap:4px;height:48px}
.pc .cols i{flex:1;background:#4A4A4A;border-radius:2px 2px 0 0;min-height:2px;transform-origin:50% 100%;animation:pc-rise .6s cubic-bezier(.2,.8,.2,1) .3s both}
.pc .cols i.on{background:var(--a)}
.pc .axis{display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-top:8px}
.pc .tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--bg3);color:var(--t1);vertical-align:2px;animation:pc-pop .4s cubic-bezier(.2,.8,.2,1.4) .35s both}
.pc .tag.a{background:var(--a);color:#000}
.pc .tag.ok{background:#14382A;color:var(--ok)}
.pc .tag.bad{background:#3A1A1E;color:var(--bad)}
.pc .opt{display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:12px 0;border-top:1px solid var(--ln)}
.pc .opt:first-child{border-top:0;padding-top:0}
.pc .opt .nm{font-size:14px;font-weight:600}
.pc .opt .pr{font-size:14px;font-weight:600;text-align:right}
.pc .opt .why{grid-column:1/-1;font-size:12px;color:var(--t2)}
.pc .opt.out .nm,.pc .opt.out .pr{color:var(--t3);font-weight:500}
.pc .opt .bar{grid-column:1/-1;height:6px}
.pc .list{margin:0;padding:0;list-style:none}
.pc .list li{padding:12px 0;border-top:1px solid var(--ln);font-size:14px}
.pc .list li:first-child{border-top:0;padding-top:0}
.pc .list li span{display:block;font-size:13px;color:var(--t2);margin-top:4px}
.pc .quote{font-size:20px;line-height:1.4;font-weight:600;letter-spacing:-.01em;margin:0;padding-left:16px;border-left:3px solid var(--a);animation:pc-land .5s cubic-bezier(.2,.8,.2,1) both}
.pc .ft{margin-top:24px;font-size:12px;color:var(--t3)}
.pc .ft b{color:var(--t2);font-weight:600}
.pc .rcpt,.pc .sum{display:grid;grid-template-columns:1fr auto;gap:8px 16px;font-size:14px;margin-top:24px;padding-top:16px;border-top:1px solid var(--ln)}
.pc .rcpt>span,.pc .sum>span{color:var(--t2)}
.pc .rcpt>b,.pc .sum>b{text-align:right;font-weight:600}
.pc .sum .tot{color:var(--t1);font-weight:700;font-size:16px}
.pc .chips{display:inline-flex;flex-wrap:wrap;gap:4px}
.pc .chip{font-size:11px;font-weight:600;line-height:16px;padding:0 6px;border-radius:4px;background:var(--bg3);color:#E6E6E6}
.pc .chip.crit{background:var(--a);color:#000}
.pc .dish{display:flex;align-items:center;gap:8px 16px;padding:8px 0;border-top:1px solid var(--ln);font-size:14px}
.pc .dish:first-child{border-top:0;padding-top:0}
.pc .dish .nm{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;flex:1;min-width:0}
.pc .dish .pr{font-weight:600;white-space:nowrap}
.pc .more{font-size:12px;color:var(--t3);padding-top:8px}
.pc .top{display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.pc .top .name{font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0;line-height:1.15;animation:pc-land .5s cubic-bezier(.2,.8,.2,1) both}
.pc .verdict{font-size:13px;font-weight:700;white-space:nowrap;padding:2px 8px;border-radius:4px;animation:pc-pop .45s cubic-bezier(.2,.8,.2,1.4) .3s both}
.pc .verdict.ok{background:#14382A;color:var(--ok)}
.pc .verdict.bad{background:#3A1A1E;color:var(--bad)}
.pc .src{font-size:12px;color:var(--t3);margin-top:8px}
.pc .why1{font-size:14px;color:var(--t2);margin-top:8px}
.pc .mini{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}
.pc .mini div{background:var(--bg2);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--t2)}
.pc .mini b{display:block;font-size:16px;color:var(--t1);font-weight:700}
.pc .total{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid var(--ln);font-size:13px;color:var(--t2)}
.pc .total b{font-size:24px;color:var(--t1);font-weight:700;letter-spacing:-.02em}
.pc .item{display:grid;grid-template-columns:40px 1fr auto;gap:0 8px;align-items:baseline;padding:4px 0;font-size:14px}
.pc .item .q{color:var(--t2);font-weight:600}
.pc .item .t{font-weight:600;text-align:right}
.pc .item .chips{grid-column:2/-1;margin-top:4px}
.pc .lane{font-size:12px;font-weight:500;color:var(--t3);margin:8px 0 0;padding-top:8px;border-top:1px solid var(--ln)}
.pc .lane:first-child{border-top:0;padding-top:0;margin-top:0}
.pc .track{display:grid;grid-template-columns:repeat(3,1fr);margin-top:24px;position:relative}
.pc .track::before{content:"";position:absolute;left:8px;right:8px;top:7px;height:2px;background:var(--ln)}
.pc .track .fill{position:absolute;left:8px;top:7px;height:2px;background:var(--a);transform-origin:0 50%;animation:pc-grow .7s cubic-bezier(.4,0,.2,1) .3s both}
.pc .step{position:relative;font-size:12px;color:var(--t3);padding-top:24px;animation:pc-in .35s ease-out both}
.pc .step::before{content:"";position:absolute;top:0;left:0;width:16px;height:16px;border-radius:50%;background:var(--bg);border:2px solid #4A4A4A;box-sizing:border-box}
.pc .step.done::before{background:var(--a);border-color:var(--a)}
.pc .step.now::before{border-color:var(--a);animation:pc-pulse 1.6s ease-in-out 1s infinite}
.pc .step.done,.pc .step.now{color:var(--t1)}
.pc .step b{display:block;font-weight:600;font-size:13px}
.pc .step:nth-child(2){animation-delay:.25s}.pc .step:nth-child(3){animation-delay:.5s;text-align:center}.pc .step:nth-child(4){animation-delay:.75s;text-align:right}
.pc .step:nth-child(3)::before{left:calc(50% - 8px)}.pc .step:nth-child(4)::before{left:auto;right:0}
.pc .st>*{animation:pc-in .4s ease-out both}
.pc .st>*:nth-child(1){animation-delay:160ms}.pc .st>*:nth-child(2){animation-delay:200ms}.pc .st>*:nth-child(3){animation-delay:240ms}.pc .st>*:nth-child(4){animation-delay:280ms}.pc .st>*:nth-child(5){animation-delay:320ms}.pc .st>*:nth-child(6){animation-delay:360ms}.pc .st>*:nth-child(7){animation-delay:400ms}.pc .st>*:nth-child(8){animation-delay:440ms}.pc .st>*:nth-child(9){animation-delay:480ms}.pc .st>*:nth-child(10){animation-delay:520ms}.pc .st>*:nth-child(n+11){animation-delay:560ms}
.pc .st>*:nth-child(1) .bar i,.pc .st>*:nth-child(1).bar i{animation-delay:260ms}.pc .st>*:nth-child(2) .bar i,.pc .st>*:nth-child(2).bar i{animation-delay:300ms}.pc .st>*:nth-child(3) .bar i,.pc .st>*:nth-child(3).bar i{animation-delay:340ms}.pc .st>*:nth-child(4) .bar i,.pc .st>*:nth-child(4).bar i{animation-delay:380ms}.pc .st>*:nth-child(5) .bar i,.pc .st>*:nth-child(5).bar i{animation-delay:420ms}.pc .st>*:nth-child(6) .bar i,.pc .st>*:nth-child(6).bar i{animation-delay:460ms}.pc .st>*:nth-child(7) .bar i,.pc .st>*:nth-child(7).bar i{animation-delay:500ms}.pc .st>*:nth-child(8) .bar i,.pc .st>*:nth-child(8).bar i{animation-delay:540ms}
.pc.prov .hd{margin-bottom:12px}.pc.prov .dish{padding:4px 0}.pc.prov .more{padding-top:4px}.pc.prov .mini{margin-top:12px}.pc.prov .mini div{padding:6px 12px}.pc.prov .total b{font-size:22px}.pc.prov .total{margin-top:12px;padding-top:12px}.pc.prov .ft{margin-top:12px}
@keyframes pc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pc-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pc-rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes pc-land{from{opacity:0;transform:scale(.94);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes pc-pop{0%{opacity:0;transform:scale(.8)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes pc-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,152,0,.55)}50%{box-shadow:0 0 0 6px rgba(255,152,0,0)}}
@keyframes pc-hat{0%{transform:translateY(0)}40%{transform:translateY(-14px)}70%{transform:translateY(2px)}100%{transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.pc,.pc *,.pc *::before{animation:none!important}}
@media (max-width:440px){.pc{padding:16px}.pc .hero{font-size:48px}.pc .mini{grid-template-columns:1fr 1fr}.pc .top .name{font-size:21px}.pc .row{grid-template-columns:80px 1fr 40px}}
</style>`;

// Pantry's mark: the Grok dome in yellow with two eyes, wearing a small white chef's toque.
const DOME = `<svg width="16" height="18" viewBox="0 0 114 128" aria-hidden="true"><g class="hat" fill="#fff" stroke="#00000040" stroke-width="3"><path d="M30 46a17 17 0 0 1 8-32 21 21 0 0 1 38 0 17 17 0 0 1 8 32z"/><rect x="33" y="40" width="48" height="14" rx="3"/></g><path d="M0 128C0 82.7 25.5 46 57 46s57 36.7 57 82z" fill="${ACCENT}"/><rect x="34" y="82" width="12" height="22" rx="6" fill="#111"/><rect x="68" y="82" width="12" height="22" rx="6" fill="#111"/></svg>`;
const LANE_COLOURS = { everyone: 'var(--sand-dataviz-0,#1084FE)', vegan: 'var(--sand-dataviz-2,#00C972)', 'gluten-free': 'var(--sand-dataviz-3,#9159FE)', 'allergy-safe': ACCENT };
// One fixed colour per need, so a need looks the same on every card. The critical ones share Pantry's yellow.
const NEED_COLOURS = {
  vegan: 'var(--sand-dataviz-2,#00C972)', vegetarian: 'var(--sand-dataviz-3,#9159FE)', pescatarian: 'var(--sand-dataviz-1,#00BCA6)',
  halal: 'var(--sand-dataviz-0,#1084FE)', 'gluten-free': 'var(--sand-dataviz-4,#FF309B)', 'dairy-free': 'var(--sand-dataviz-5,#936439)', 'no-pork': 'var(--sand-dataviz-6,#777777)',
};
const needColour = n => (n.critical ? ACCENT : NEED_COLOURS[n.id] ?? 'var(--sand-dataviz-6,#777777)');

const wrap = (label, body, foot = '', cls = '') => `${STYLE}<section id="pantry-card" class="pc${cls ? ` ${cls}` : ''}" role="group" aria-label="${esc(label)}"><p class="hd">${DOME}<span>Pantry · ${esc(label)}</span></p>${body}${foot ? `<p class="ft">${foot}</p>` : ''}</section>`;
const bar = (pctWidth, mute = false) => `<div class="bar"><i class="${mute ? 'mute' : ''}" style="width:${pctWidth.toFixed(1)}%"></i></div>`;
const row = (name, value, pctWidth, mute) => `<div class="row"><span class="n">${esc(name)}</span>${bar(pctWidth, mute)}<span class="v">${esc(value)}</span></div>`;
const month = d => new Date(`${d}T12:00:00Z`).toLocaleString('en-GB', { month: 'short' });

function headcountCard(s) {
  const h = s.headcount;
  const basis = h.basis ?? [];
  const cols = basis.map(b => `<i class="${b.weight >= 2 ? 'on' : ''}" style="height:${Math.max(4, b.rate * 100).toFixed(0)}%" title="${esc(`${b.date}: ${b.attended} of ${b.signedUp}`)}"></i>`).join('');
  const body = `<p class="hero">${h.planFor}<span class="u">to plan for</span></p>
<p class="lede"><b>${h.signedUp}</b> signed up. Past events point to <b>${pct(h.showRate)}</b> turning up.</p>
<div class="sec st">${row('Signed up', h.signedUp, 100, true)}${row('Expected', h.expected, share(h.expected, h.signedUp), true)}${row('Plan for', h.planFor, share(h.planFor, h.signedUp))}</div>
${h.criticalAt100 ? `<p class="note"><span class="dot"></span><span><b>${h.criticalAt100}</b> allergy or coeliac guests get a sealed plate whatever the turnout</span></p>` : ''}
${basis.length ? `<div class="sec"><p class="lbl">Turnout at the last ${basis.length} events · ${esc(s.event?.kind === 'hackathon' ? 'hackathons' : 'events like this one')} in yellow</p><div class="cols" role="img" aria-label="${esc(basis.map(b => `${b.date} ${pct(b.rate)}`).join(', '))}">${cols}</div><div class="axis"><span>${esc(month(basis[0].date))}</span><span>${esc(month(basis.at(-1).date))}</span></div></div>` : ''}`;
  return {
    title: `Plan for ${h.planFor}, not ${h.signedUp}`,
    html: wrap('Headcount', body, h.overridden ? 'Your own number, not the forecast.' : ''),
    alt: `Plan for ${h.planFor}: ${h.signedUp} signed up, ${pct(h.showRate)} expected to come (${h.expected}), and ${h.criticalAt100} allergy or coeliac guests planned at 100%.`,
  };
}

function dietsCard(s) {
  const d = s.diets;
  const total = d.needs.reduce((n, x) => n + x.count, 0) || 1;
  const segs = [...d.needs].sort((x, y) => Number(y.critical) - Number(x.critical) || y.count - x.count).map(n => `<i style="width:${share(n.count, total).toFixed(2)}%;background:${needColour(n)}"></i>`).join('');
  const ordered = [...d.needs].sort((x, y) => Number(y.critical) - Number(x.critical) || y.count - x.count);
  const keys = ordered.map(n => `<div class="key"><span class="sw" style="background:${needColour(n)}"></span>${esc(n.label)}${n.critical ? ' <span class="tag a">100%</span>' : ''}<b>${n.count}</b></div>`).join('');
  const body = `<p class="hero">${d.declared}<span class="u">declared a need</span></p>
<p class="lede">Of <b>${d.signedUp}</b> signed up. Every one gets a safe plate.</p>
<div class="sec"><div class="stack" role="img" aria-label="${esc(d.needs.map(n => `${n.label} ${n.count}`).join(', '))}">${segs}</div><div class="keys st">${keys}</div></div>`;
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
<p class="lede">Budget <b>${gbp0(budget)}</b>. ${outs.length ? `${outs.length} out, each for a reason.` : 'None ruled out.'}</p>
<div class="sec st">${[...ins, ...outs].slice(0, 8).map(opt).join('')}</div>`;
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
<div class="sec"><p class="lbl">Plates by lane</p><div class="stack" role="img" aria-label="${esc(lanes.map(l => `${l.label} ${l.portions}`).join(', '))}">${segs}</div><div class="keys st">${keys}</div></div>`;
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
<div class="sec"><ul class="list st">${i.needsYou.map(n => `<li>${esc(n.subject)}<span>${esc(n.note)}</span></li>`).join('')}</ul></div>`;
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
  const steps = [['Requested', 'by Pantry'], ['Approved by you', 'your yes'], ['Paid', 'card closed']];
  const track = stopped ? '' : `<div class="track" role="list" aria-label="Payment progress"><span class="fill" style="width:${['0px', 'calc(50% - 8px)', 'calc(100% - 16px)'][at]}"></span>${steps.map(([t, sub], i) => `<div role="listitem" class="step ${i < done ? 'done' : i === done ? 'now' : ''}"><b>${esc(t)}</b>${esc(sub)}</div>`).join('')}</div>`;
  const processor = pay ? `${PROCESSOR[pay.processor] ?? pay.processor}${pay.sandbox ? ' · sandbox' : ''}` : 'single-use card, issued on approval';
  const masked = maskCard(pay?.card) ?? (a.card?.last4 ? `•••• ${a.card.last4}` : null);
  const plates = s.plan?.chosen?.portions;
  const body = `<p class="hero">${gbp(a.amount)}</p>
<p class="lede">to <b>${esc(a.merchant)}</b> <span class="tag ${tone}">${esc(label)}</span></p>
${track}
<div class="rcpt st">${plates ? `<span>Plates</span><b>${plates}</b>` : ''}<span>For</span><b>${esc(s.event?.name ?? a.memo ?? '')}</b><span>Processor</span><b>${esc(processor)}</b>${masked ? `<span>Card</span><b>${esc(masked)}${paid ? ' · closed' : ''}</b>` : ''}${pay?.reference ? `<span>Reference</span><b>${esc(pay.reference)}</b>` : `<span>Request</span><b>${esc(a.id)}</b>`}</div>`;
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
<div class="sec st">${row('Ordered for', e.orderedFor, 100, true)}${row('Came', e.attended, share(e.attended, e.orderedFor))}</div>
<div class="sec"><p class="lbl">What changes next time</p><ul class="list st">${learnings.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
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
<p class="src">${esc(TIER[o.tier] ?? o.tier)}${srcLine ? ` · ${esc(srcLine)}` : ''}</p>
${safeAll && !o.addons?.length ? '' : `<p class="why1">${esc(reason)}</p>`}
<div class="sec st" style="margin-top:16px">${shown.map(d => `<div class="dish"><span class="nm"><span>${esc(d.name)}</span>${chips(d.tags)}</span><span class="pr">${gbp(d.price)}</span></div>`).join('')}${dishes.length > shown.length ? `<p class="more">+${dishes.length - shown.length} more</p>` : ''}</div>
<div class="mini st"><div><b>${f.fee ? gbp(f.fee) : 'Free'}</b>${esc(f.type === 'collection' ? 'collection' : 'delivery')}</div><div><b>${esc(hoursLabel(f.leadHours))}</b>notice</div><div><b>${minOrder ? gbp0(minOrder) : 'None'}</b>minimum</div><div><b>${reviews?.rating ? Number(reviews.rating).toFixed(1) : 'n/a'}</b>${reviews?.rating ? `${Number(reviews.count ?? 0).toLocaleString('en-GB')} reviews` : 'no reviews'}</div></div>
<div class="total"><span>Total for ${o.portions} · ${gbp(o.cost.perExpected)} a head</span><b>${gbp(o.cost.total)}</b></div>`;
  return {
    title: `${o.name}: ${safeAll ? 'safe for everyone' : 'out'}`,
    html: wrap(TIER[o.tier] ?? 'Provider', body, o.cost.quoted ? 'Quoted price.' : o.live ? 'Prices read from their site; confirm before paying.' : 'Estimate.', 'prov'),
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
  const body = `<p class="hero">${gbp(c.cost.total)}</p>
<p class="lede"><b>${c.portions}</b> plates from <b>${esc(c.name)}</b> · ${left >= 0 ? `${gbp(left)} under budget` : `${gbp(-left)} over budget`}</p>
<div class="sec st">${items}</div>
<div class="sum st"><span>Food</span><b>${gbp(c.cost.food)}</b>${c.cost.extras ? `<span>Drinks and extras</span><b>${gbp(c.cost.extras)}</b>` : ''}<span>Delivery${c.addons?.length ? ` (${c.addons.length + 1} drops)` : ''}</span><b>${c.cost.fee ? gbp(c.cost.fee) : 'Free'}</b><span class="tot">Total</span><b class="tot">${gbp(c.cost.total)}</b></div>`;
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
