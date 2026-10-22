// Pantry's voice, generated from the live plan so narration never contradicts the numbers.
// Warm, direct, short sentences. Opinions with a spine. No filler.
import { shortName } from './identity.js';
import { nice } from './inbox.js';
import { capitalise, clock, dayMonth, gbp, listJoin, longDate, money, numberWord, partOfDay, pct, shortDay, weekday } from './util.js';

const units = l => l.qty * l.pack.units;

export function eggWords(n) {
  if (n % 12 === 0) return `${numberWord(n / 12)} dozen`;
  if (n === 6) return 'a six-pack';
  return `${numberWord(n)} eggs`;
}

const coverageWords = c => (c === 0.5 ? 'half' : c === 0.25 ? 'a quarter of' : c === 1 ? 'all of' : `${pct(c)} of`);

function qtyWords(family, lines) {
  const n = lines.reduce((s, l) => s + units(l), 0);
  if (family === 'eggs') return eggWords(n);
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  return `${numberWord(qty)} ${nice(lines[0].name).toLowerCase()}`;
}

const sizeWord = name => (String(name).match(/\b(Extra Large|Large|Medium|Mixed)\b/) ?? [])[1] ?? '';

function hook({ world, current }) {
  const eggs = current.predictions.find(p => p.family === 'eggs');
  if (!eggs) return null;
  const lines = current.cart.lines.filter(l => l.family === 'eggs' && l.status === 'in');
  const mains = eggs.history.filter(h => h.type === 'main');
  const topUps = eggs.history.filter(h => h.type === 'top-up');
  const mainDay = mains.length ? weekday(mains[0].at) : 'Monday';
  const runsOut = new Date(eggs.runsOutAt);
  const part = partOfDay(runsOut);
  const amount = lines.length ? capitalise(qtyWords('eggs', lines)) : 'A dozen';
  const nudgeAt = new Date(current.now);
  return {
    family: 'eggs',
    shops: world.history.length,
    since: dayMonth(world.history[0].deliveredAt),
    perWeek: Math.round(eggs.perWeek),
    mainDay,
    weeks: mains.length,
    topUps: topUps.length,
    runsOutAt: eggs.runsOutAt,
    runsOut: `${weekday(runsOut)} ${part}`,
    runsOutClock: clock(runsOut),
    amount,
    nudgeAt: `${weekday(nudgeAt)} ${clock(nudgeAt)}`,
    nudge: `Eggs run out ${weekday(runsOut)} ${part}. ${amount} are in ${current.slot.day}'s ${current.slot.window} delivery.`,
    lines: [
      `Read ${world.history.length} shops since ${dayMonth(world.history[0].deliveredAt)}.`,
      `Eggs: ${Math.round(eggs.perWeek)} a week. A dozen every ${mainDay}, and a top-up dozen every week.`,
      `${mainDay}'s dozen runs out ${weekday(runsOut)} ${part}.`,
      `${weekday(nudgeAt)}, ${clock(nudgeAt)}: nudge sent. ${amount} in ${current.slot.day}'s cart.`,
    ],
  };
}

function replacement({ world, current }) {
  const line = current.cart.lines.find(l => l.replaced?.reason === 'unavailable');
  if (!line) return null;
  const usual = world.catalog.get(line.replaced.from);
  const pick = world.catalog.get(line.sku);
  const diff = usual.price - pick.price;
  const day = current.slot.day;
  const sameSize = usual.pack.units === pick.pack.units;
  let opinion;
  if (line.family === 'eggs' && sameSize && diff > 0) {
    opinion = `Your usual ${sizeWord(usual.name)} dozen is out for ${day}. These are better: same twelve, ${money(diff)} less. You're scrambling them, not judging them.`;
  } else {
    opinion = `${nice(usual.name)} is out for ${day}. ${nice(pick.name)} is the better buy${diff > 0 ? `: ${money(diff)} less` : ''}.`;
  }
  const card = p => ({ sku: p.sku, name: p.name, art: p.art, image: p.image, url: p.url, price: p.price, unitPrice: p.price / p.pack.units, pack: p.pack, source: p.source });
  return { family: line.family, key: line.key, usual: card(usual), pick: card(pick), qty: line.qty, opinion, reason: `Out of stock for ${day}` };
}

const RULE_WORDS = { avoid: { flour: 'no flour', 'ultra-processed': 'nothing processed', caffeine: 'no caffeine', spicy: 'no spice' }, limit: { dairy: 'minimal dairy' } };

export function rulePhrase(member) {
  if (member.needs?.length) return capitalise(listJoin(member.needs.map(t => (t === 'toddler' ? 'toddler staples' : t))));
  const avoid = (member.avoid ?? []).map(t => RULE_WORDS.avoid[t] ?? `no ${t}`);
  const limit = (member.limit ?? []).map(t => RULE_WORDS.limit[t] ?? `minimal ${t}`);
  const [first, ...rest] = avoid;
  return capitalise([first, ...limit, ...rest].filter(Boolean).join(', '));
}

function split({ world, current }) {
  const { household } = world;
  const adults = household.members.filter(m => m.role === 'adult');
  const child = household.members.find(m => m.role === 'child');
  const left = current.cart.leftOut.map(l => shortName(l.family));
  return {
    rules: Object.fromEntries(household.members.map(m => [m.id, rulePhrase(m)])),
    lines: [
      'One cart, three people, three rules.',
      `Grown-ups: ${rulePhrase(adults[0]).toLowerCase()}.`,
      `${capitalise(household.lanes.child)}: ${rulePhrase(child).toLowerCase()}. Her needs win on staples.`,
      left.length ? `${capitalise(listJoin(left.slice(0, 3)))} left off. Treats are the grown-ups' call.` : 'Nothing left off this week.',
    ],
    leftOut: left,
  };
}

function identityBeat({ current }) {
  const id = current.identity;
  if (!id.drifted) return { lines: [id.text] };
  return {
    lines: [
      `${id.shops.length} shops in, one change stands out.`,
      id.text,
      id.detail,
      id.fix,
    ],
  };
}

function trust({ world }) {
  return {
    lines: [
      'Logins live in 1Password. Pantry never sees the password.',
      'The card lives in Agentcard Vault, on your phone, behind Face ID.',
      'One merchant. One amount. Twelve hours. Then the card is dead.',
    ],
    merchant: "Sainsbury's",
  };
}

function close({ current, state }) {
  const slot = current.slot;
  const approval = [...state.approvals].reverse().find(a => ['pending', 'approved', 'charged'].includes(a.status));
  const charged = approval?.status === 'charged';
  const before = current.critical ? `Lands ${slot.landsBefore} before the last ${current.critical.family === 'eggs' ? 'egg' : nice(current.critical.family)}.` : '';
  return {
    prompt: `Pantry wants to spend ${gbp(current.totals.total)} at Sainsbury's.`,
    delivery: `${slot.day}, ${slot.window}.`,
    landsBefore: before,
    lines: [
      `Pantry wants to spend ${gbp(current.totals.total)} at Sainsbury's.`,
      charged ? 'Approved with Face ID.' : 'Waiting for Face ID.',
      charged ? 'Single-use card swapped in. Charge cleared. Card dead.' : null,
      `${slot.day}, ${slot.window}. ${before}`.trim(),
      current.inbox.text,
    ].filter(Boolean),
  };
}

function deals({ current, next, state }) {
  const taken = Object.values(state.preferences).find(p => p.reason === 'deal' && p.offer);
  const offer = taken?.offer ?? next?.deals.offers.find(o => o.family === 'eggs') ?? next?.deals.offers[0] ?? current.deals.offers[0] ?? null;
  const accepted = Boolean(taken && offer && taken.dealId === offer.id);
  const clipped = current.deals.clipped.map(c => `${c.type === 'coupon' ? `a ${c.label}` : c.label} on ${nice(c.name)}`);
  const ignored = current.deals.ignored.length;
  if (!offer) return { offer: null, lines: ['No deals worth your time this week.'] };
  const from = new Date(`${offer.validFrom}T00:00:00Z`);
  const fromDay = shortDay(from) === shortDay(new Date(current.now)) ? 'today' : `from ${weekday(from)}`;
  const isEggs = offer.family === 'eggs';
  const ask = isEggs
    ? `It covers ${coverageWords(offer.coverage)} your run. Two beat a dozen by ${money(offer.perRunSaving)}. Want the switch?`
    : `Saves ${money(offer.saving)} on next week's cart. Want the switch?`;
  return {
    offer,
    accepted,
    headline: `${offer.label}: ${isEggs ? 'the six-pack' : nice(offer.to.name)} is ${gbp(offer.to.unitPrice)} ${fromDay}.`,
    ask,
    done: `Next week's cart: rerouted. ${money(offer.saving)} off.`,
    alsoClipped: clipped.length ? `Already clipped this week: ${listJoin(clipped)}.` : null,
    ignored: ignored ? `Ignored ${ignored} offers that don't fit how you live.` : null,
    lines: [
      `${offer.label}: ${isEggs ? 'the six-pack' : nice(offer.to.name)} is ${gbp(offer.to.unitPrice)} ${fromDay}.`,
      ask,
      accepted ? `Next week's cart: rerouted. ${money(offer.saving)} off.` : null,
    ].filter(Boolean),
  };
}

function threadMessages({ world, current }) {
  const h = hook({ world, current });
  const blue = current.cart.lines.filter(l => l.family === 'blueberries' && l.status === 'in');
  const blueQty = blue.reduce((s, l) => s + l.qty, 0);
  const pizzaLeft = current.cart.leftOut.some(l => l.family === 'pizza');
  const fill = {
    nudge: h?.nudge ?? 'Nothing running out this week.',
    eggsAnswer: h ? `${h.amount}, ${current.slot.day} ${current.slot.window}. Lands before the last one goes.` : 'Not needed this week.',
    blueberriesAnswer: blueQty ? `Already in. ${capitalise(numberWord(blueQty))} punnet${blueQty > 1 ? 's' : ''} on ${current.slot.day}, on top of what's in the fridge.` : `Added. They land ${current.slot.day}.`,
    cartAnswer: `${current.totals.count} things, ${gbp(current.totals.total)}.${pizzaLeft ? " No pizza this week. Tap it if you miss it." : ''}`,
  };
  const thread = world.thread;
  return thread.map(m => ({ ...m, surfaceLabel: world.threadSurfaces?.[m.surface] ?? m.surface, time: clock(m.at), text: m.text.replace(/\{\{(\w+)\}\}/g, (_, k) => fill[k] ?? '') }));
}

export function story({ world, current, next, state }) {
  return {
    open: { lines: ['You are what you shop.'] },
    hook: hook({ world, current }),
    split: split({ world, current }),
    identity: identityBeat({ current }),
    trust: trust({ world }),
    thread: threadMessages({ world, current }),
    replacement: replacement({ world, current }),
    carousel: { lines: [`${current.totals.count} things. Tap to keep, drop or swap.`] },
    close: close({ current, state }),
    deals: deals({ current, next, state }),
    vision: { lines: ['Same engine.', 'Household to a room of fifty.'] },
    asOf: longDate(current.now),
  };
}
