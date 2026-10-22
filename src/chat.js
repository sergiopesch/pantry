// Pantry's conversation in the app. Deterministic intents over the engine: the same verbs the Grok Bot
// uses through MCP, so the chat really does things (add, drop, swap, explain, check out) with no network.
import { shortName } from './identity.js';
import { nice } from './inbox.js';
import { eggWords, story as tell } from './narrate.js';
import { acceptOffer, editCart, householdNow, plan, planNext, requestCheckout } from './pantry.js';
import { capitalise, gbp, iso, listJoin, longDate, money, numberWord, partOfDay, shortId, weekday } from './util.js';

const WORDS = {
  eggs: ['eggs', 'egg', 'dozen'],
  milk: ['milk'],
  yoghurt: ['yoghurts', 'yogurts', 'yoghurt', 'yogurt'],
  cheddar: ['cheddar', 'cheese'],
  bread: ['bread', 'loaf', 'toast'],
  pasta: ['fusilli', 'pasta'],
  bananas: ['bananas', 'banana'],
  strawberries: ['strawberries', 'strawberry'],
  blueberries: ['blueberries', 'blueberry'],
  apples: ['apples', 'apple'],
  avocados: ['avocados', 'avocado', 'avos', 'avo'],
  broccoli: ['broccoli'],
  spinach: ['spinach'],
  'sweet-potatoes': ['sweet potatoes', 'sweet potato'],
  carrots: ['carrots', 'carrot'],
  potatoes: ['baby potatoes', 'potatoes', 'potato'],
  rice: ['basmati', 'rice'],
  'olive-oil': ['olive oil', 'oil'],
  chicken: ['chicken', 'thighs'],
  mince: ['mince', 'beef'],
  'fish-fingers': ['fish fingers', 'fish finger'],
  salmon: ['salmon', 'fish'],
  coffee: ['coffee', 'espresso', 'beans'],
  chillies: ['chillies', 'chilies', 'chilli', 'chili'],
  pizza: ['pizzas', 'pizza'],
  crisps: ['crisps', 'chips'],
  nuggets: ['nuggets', 'nugget'],
  brioche: ['brioche', 'rolls', 'buns'],
  biscuits: ['digestives', 'biscuits', 'biscuit', 'cookies'],
  'ready-meals': ['ready meals', 'ready meal', 'lasagne'],
};

const NOUNS = {
  blueberries: ['punnet', 'punnets'], strawberries: ['punnet', 'punnets'], milk: ['bottle', 'bottles'], bread: ['loaf', 'loaves'],
  yoghurt: ['pot', 'pots'], avocados: ['pack', 'packs'], apples: ['bag', 'bags'], salmon: ['pack', 'packs'], chicken: ['pack', 'packs'],
  mince: ['pack', 'packs'], broccoli: ['head', 'heads'], spinach: ['bag', 'bags'], coffee: ['bag', 'bags'], chillies: ['pack', 'packs'],
  rice: ['bag', 'bags'], pasta: ['bag', 'bags'], cheddar: ['block', 'blocks'], 'sweet-potatoes': ['bag', 'bags'], potatoes: ['bag', 'bags'],
  carrots: ['bag', 'bags'], pizza: ['pizza', 'pizzas'], crisps: ['multipack', 'multipacks'], nuggets: ['bag', 'bags'],
};

const NUMBERS = { a: 1, an: 1, one: 1, another: 1, two: 2, couple: 2, three: 3, few: 3, four: 4, five: 5, six: 6 };

const FAMILY_NAMES = { 'sweet-potatoes': 'sweet potatoes', 'olive-oil': 'olive oil', 'ready-meals': 'ready meals', 'fish-fingers': 'fish fingers' };
const familyName = f => FAMILY_NAMES[f] ?? f;
const display = name => String(name).replace(/^Sainsbury's\s+/i, ''); // keeps the pack size, unlike nice()

export function findFamilies(text) {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ')} `;
  const hits = [];
  const taken = [];
  const entries = Object.entries(WORDS).flatMap(([family, words]) => words.map(w => [family, w])).sort((a, b) => b[1].length - a[1].length);
  for (const [family, word] of entries) {
    const at = t.indexOf(` ${word} `);
    if (at < 0 || taken.some(([s, e]) => at < e && at + word.length + 2 > s)) continue;
    taken.push([at, at + word.length + 2]);
    if (!hits.some(h => h.family === family)) hits.push({ family, at });
  }
  return hits.sort((a, b) => a.at - b.at).map(h => h.family);
}

function quantity(text) {
  const t = text.toLowerCase();
  const digits = t.match(/\b(\d{1,2})\b/);
  if (digits) return Number(digits[1]);
  for (const [w, n] of Object.entries(NUMBERS)) if (new RegExp(`\\b${w}\\b`).test(t) && w !== 'a' && w !== 'an') return n;
  return 1;
}

export function amountWords(line) {
  if (!line) return '';
  const units = line.qty * line.pack.units;
  if (line.family === 'eggs') return eggWords(units);
  if (line.pack.unit === 'banana') return `${numberWord(units)} banana${units === 1 ? '' : 's'}`;
  const [one, many] = NOUNS[line.family] ?? ['pack', 'packs'];
  return `${numberWord(line.qty)} ${line.qty === 1 ? one : many} of ${familyName(line.family)}`;
}

const INTENTS = [
  ['thanks', /\b(thanks|thank you|cheers|ta|nice one|perfect|lovely)\b/],
  ['greet', /^(hi|hey|hello|morning|good morning|afternoon|evening|good evening|yo)\b/],
  ['checkout', /(check ?out|\bpay\b|buy it|order it|place (the )?order|go ahead|let'?s do it|book it|confirm|ok,? buy|send it)/],
  ['remove', /\b(remove|drop|skip|cancel|take out|delete|without|no more|leave out|lose the|forget the)\b|^no\b|don'?t (need|want)/],
  ['swap', /\b(swap|switch|change|replace|different|cheaper)\b/],
  ['why', /\bwhy\b/],
  ['add', /\b(add|get|buy|need|want|wants|more|another|extra|asking for|craving|throw in|pop in|grab|include|bring back|put in)\b/],
  ['running', /(run(ning)? (out|low)|low on|out of|what do we need|need anything|what are we out)/],
  ['delivery', /(deliver|delivery|arriv|slot|when.*(come|here)|\beta\b)/],
  ['deals', /(deal|nectar|offer|coupon|discount|saving)/],
  ['inbox', /(email|inbox|mail|refund|missing|substitut|swapped)/],
  ['insight', /(processed|healthy|eating|junk|drift|how are we doing|trend)/],
  ['household', /(rules|who eats|household|diet|allerg|dairy|flour)/],
  ['cart', /(cart|basket|list|what'?s in|whats in|show me|the shop|this week)/],
];

export function intentOf(text) {
  const t = text.toLowerCase().trim();
  if (!t) return 'help';
  const families = findFamilies(t);
  for (const [name, re] of INTENTS) {
    if (!re.test(t)) continue;
    if (['remove', 'swap', 'add'].includes(name) && !families.length) continue;
    return name;
  }
  return families.length ? 'product' : 'help';
}

function lineFor(current, family) {
  return current.cart.lines.find(l => l.family === family && l.status === 'in') ?? current.cart.lines.find(l => l.family === family);
}

function skuFor(world, current, family) {
  return lineFor(current, family)?.sku ?? current.predictions.find(p => p.family === family)?.usualSku ?? world.catalog.family(family)[0]?.sku;
}

const when = d => `${weekday(d)} ${partOfDay(d)}`;

function reply(world, state, text) {
  const now = householdNow(world, state);
  let current = plan(world, state, { now });
  const intent = intentOf(text);
  const families = findFamilies(text);
  const family = families[0];
  const order = state.orders.find(o => o.slotId === current.slot.id);
  const slot = current.slot;
  const refresh = () => (current = plan(world, state, { now }));

  switch (intent) {
    case 'thanks':
      return { text: 'Anytime.' };

    case 'greet': {
      const part = partOfDay(now);
      const hello = part === 'morning' ? 'Morning.' : part === 'afternoon' ? 'Afternoon.' : 'Evening.';
      if (order) return { text: `${hello} ${order.slotDay}, ${order.slotWindow} is booked. Nothing needs you.`, card: { type: 'delivery' } };
      const eggs = current.predictions.find(p => p.family === 'eggs');
      return { text: `${hello} ${eggs ? `Eggs run out ${when(eggs.runsOutAt)}. ` : ''}${current.totals.count} things are lined up for ${slot.day}.`, card: { type: 'cart' } };
    }

    case 'checkout': {
      if (order) return { text: `Already done. ${order.slotDay}, ${order.slotWindow}. Paid ${gbp(order.total)}.`, card: { type: 'delivery' } };
      const approval = requestCheckout(world, state);
      return { text: `${gbp(approval.amount)} at Sainsbury's for ${slot.day} ${slot.window}. Face ID when you're ready.`, card: { type: 'approval', id: approval.id } };
    }

    case 'remove': {
      if (order) return { text: `${order.slotDay}'s order is already paid. I'll leave ${familyName(family)} off next week's.` };
      const lines = current.cart.lines.filter(l => l.family === family && l.status === 'in');
      if (!lines.length) {
        const left = current.cart.leftOut.find(l => l.family === family);
        return { text: left ? `Already off. ${left.why}` : `${capitalise(familyName(family))} isn't in this week.` };
      }
      const back = lines.reduce((s, l) => s + l.price, 0);
      for (const l of lines) editCart(state, l.key, 'exclude');
      refresh();
      return { text: `${capitalise(familyName(family))} out. ${money(back)} back. ${current.totals.count} things, ${gbp(current.totals.total)}.`, card: { type: 'cart' } };
    }

    case 'swap': {
      const line = lineFor(current, family);
      if (!line) return { text: `${capitalise(familyName(family))} isn't in this week, so there's nothing to swap.` };
      const per = p => p.price / p.pack.units;
      const options = line.alternatives.map(s => world.catalog.get(s)).filter(Boolean);
      const alt = /cheap/.test(text.toLowerCase()) ? [...options].sort((a, b) => per(a) - per(b))[0] : options[0];
      if (!alt) return { text: `That's the only ${familyName(family)} I'd buy. Keeping it.` };
      editCart(state, line.key, 'swap', alt.sku);
      refresh();
      const now2 = lineFor(current, family);
      const cheaper = per(alt) < per(world.catalog.get(line.sku));
      return { text: `Swapped to ${display(alt.name)}. ${cheaper ? `${money(per(world.catalog.get(line.sku)) - per(alt))} less per ${alt.pack.unit}.` : 'A bit dearer, but you asked.'}`, card: { type: 'product', sku: now2?.sku } };
    }

    case 'why': {
      if (!family) {
        const left = current.cart.leftOut.map(l => shortName(l.family));
        return { text: left.length ? `Ask me about anything. Why ${listJoin(left.slice(0, 2))} are off, why the bananas are loose, why Thursday.` : 'Ask me about anything in the cart.' };
      }
      const left = current.cart.leftOut.find(l => l.family === family);
      if (left) {
        const drifted = current.identity.drivers?.find(d => d.family === family);
        return { text: `${left.why}${drifted ? ` It crept in on ${longDate(drifted.firstSeen)}.` : ''}`, card: { type: 'confirm', text: `Bring the ${shortName(family)} back?`, actions: [{ label: 'Add it back', action: { type: 'add', sku: left.sku, qty: 1 } }, { label: 'Leave it off', action: { type: 'noop', text: 'Leaving it off.' } }] } };
      }
      const line = lineFor(current, family);
      if (line?.replaced?.reason === 'learned') return { text: line.replaced.text };
      if (line?.replaced?.reason === 'unavailable') {
        const told = tell({ world, current, next: planNext(world, state, current), state });
        return { text: told.replacement?.opinion ?? 'Your usual is out for that slot.', card: { type: 'product', sku: line.sku } };
      }
      if (line) {
        const out = line.runsOutAt ? `Runs out ${when(line.runsOutAt)}.` : 'You asked for it.';
        return { text: `${out}${line.why ? ` ${line.why}` : ''}` };
      }
      const skipped = current.cart.skipped.find(s => s.family === family);
      if (skipped) return { text: `You're fine for ${familyName(family)} till ${longDate(skipped.runsOutAt)}. I'll add it the week it's needed.` };
      return { text: `You don't usually buy ${familyName(family)}. Want some anyway?` };
    }

    case 'add': {
      if (order) return { text: `${order.slotDay}'s order is paid, so that goes in next week's. Noted.` };
      const sku = skuFor(world, current, family);
      const product = world.catalog.get(sku);
      if (!product) return { text: `I can't find ${familyName(family)} at Sainsbury's yet. I'll look next time I browse.` };
      const left = current.cart.leftOut.find(l => l.family === family);
      const vetoed = product.kind === 'discretionary' && !lineFor(current, family);
      if (vetoed) {
        return {
          text: `${capitalise(familyName(family))} is a treat, and treats are the grown-ups' call. Add it anyway?`,
          card: { type: 'confirm', text: left ? 'It crept in on 3 October and I left it off.' : '', actions: [{ label: 'Add it', action: { type: 'add', sku, qty: quantity(text) } }, { label: 'Leave it off', action: { type: 'noop', text: 'Leaving it off. Good call.' } }] },
        };
      }
      const qty = quantity(text);
      editCart(state, '', 'add', sku, qty);
      refresh();
      const line = lineFor(current, family);
      return { text: `Done. ${capitalise(amountWords(line))} for ${slot.day}.`, card: { type: 'product', sku: line.sku } };
    }

    case 'running': {
      const live = current.predictions.filter(p => current.cart.lines.some(l => l.family === p.family && l.status === 'in'));
      if (family) {
        const p = current.predictions.find(x => x.family === family);
        if (!p) return { text: `I haven't seen you buy ${familyName(family)} enough to say.` };
        const line = lineFor(current, family);
        return { text: `${capitalise(familyName(family))} run${family.endsWith('s') ? '' : 's'} out ${when(p.runsOutAt)}.${line && !order ? ` ${capitalise(amountWords(line))} ${line.qty * line.pack.units > 1 ? 'are' : 'is'} in ${slot.day}'s delivery.` : ''}` };
      }
      const top = live.slice(0, 3);
      if (!top.length) return { text: 'Nothing runs out before the next delivery.' };
      const [first, ...rest] = top;
      const then = rest.length ? ` Then ${listJoin(rest.map(p => `${familyName(p.family)} ${weekday(p.runsOutAt)}`))}.` : '';
      return {
        text: `${capitalise(familyName(first.family))} run${first.family.endsWith('s') ? '' : 's'} out ${when(first.runsOutAt)}.${then} ${order ? `All in ${order.slotDay}'s delivery.` : `All in ${slot.day}'s cart.`}`,
        card: { type: 'predictions' },
      };
    }

    case 'delivery':
      if (order) return { text: `${order.slotDay}, ${order.slotWindow}. Booked and paid.`, card: { type: 'delivery' } };
      return { text: `Not booked yet. ${slot.day}, ${slot.window} is the one. ${slot.landsBefore ? `It lands ${slot.landsBefore} before the eggs run out.` : ''}`.trim(), card: { type: 'delivery' } };

    case 'deals': {
      const next = planNext(world, state, current);
      const offer = next?.deals.offers[0] ?? current.deals.offers[0];
      const clipped = current.deals.clipped.length;
      if (!offer) return { text: clipped ? `${clipped} already clipped this week. Nothing else worth your time.` : 'Nothing worth your time this week.' };
      return { text: `${offer.label}: the ${offer.to.units === 6 ? 'six-pack' : nice(offer.to.name)} is ${gbp(offer.to.unitPrice)} from Monday. It covers ${offer.coverage === 0.5 ? 'half' : 'part of'} your run. Want the switch?`, card: { type: 'deal', id: offer.id } };
    }

    case 'inbox':
      return { text: current.inbox.text, card: { type: 'inbox' } };

    case 'insight':
      return { text: current.identity.drifted ? `${current.identity.text} ${current.identity.detail}` : current.identity.text, card: { type: 'insight' } };

    case 'household':
      return { text: `Grown-ups: no flour, minimal dairy, nothing processed. She needs milk, dairy and toddler staples. Her needs win on staples; treats are the grown-ups' call.`, card: { type: 'household' } };

    case 'cart':
      if (order) return { text: `${order.slotDay}'s order: ${order.count} things, paid ${gbp(order.total)}.`, card: { type: 'delivery' } };
      return { text: `${current.totals.count} things, ${gbp(current.totals.total)} for ${slot.day} ${slot.window}.`, card: { type: 'cart' } };

    case 'product': {
      const line = lineFor(current, family);
      if (line && line.status === 'in') return { text: `${capitalise(amountWords(line))} already in for ${slot.day}. Want more?`, card: { type: 'product', sku: line.sku } };
      const left = current.cart.leftOut.find(l => l.family === family);
      if (left) return { text: `Off this week. ${left.why}` };
      return { text: `Not in this week. Say "add ${familyName(family)}" and it's in.` };
    }

    default:
      return { text: 'I can add, drop or swap anything, tell you what runs out next, or check out. Try "add blueberries" or "why no pizza?"' };
  }
}

function stamp(world, state) {
  return iso(householdNow(world, state));
}

export function say(world, state, text, { from = world.household.members[0].id } = {}) {
  const at = stamp(world, state);
  const mine = { id: shortId('m'), at, from, surface: 'app', text: String(text).slice(0, 500) };
  state.messages.push(mine);
  let answer;
  try {
    answer = reply(world, state, mine.text);
  } catch (err) {
    answer = { text: err.message };
  }
  const theirs = { id: shortId('m'), at, from: 'pantry', surface: 'app', ...answer };
  state.messages.push(theirs);
  return { asked: mine, answer: theirs };
}

// Buttons on chat cards ("Add it anyway", "Switch", "Leave it off").
export function act(world, state, action) {
  const at = stamp(world, state);
  let text;
  let card;
  if (action.type === 'add') {
    editCart(state, '', 'add', action.sku, action.qty ?? 1);
    const current = plan(world, state);
    const line = current.cart.lines.find(l => l.sku === action.sku);
    text = `In. ${capitalise(amountWords(line))} for ${current.slot.day}.`;
    card = { type: 'product', sku: action.sku };
  } else if (action.type === 'offer') {
    const r = acceptOffer(world, state, action.id);
    text = `Switched. Next week's cart: ${money(r.saving)} less.`;
  } else {
    text = action.text ?? 'OK.';
  }
  const msg = { id: shortId('m'), at, from: 'pantry', surface: 'app', text, ...(card ? { card } : {}) };
  state.messages.push(msg);
  return msg;
}
