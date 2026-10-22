// Who in the house eats what, and which lane of the cart an item lands in.
// Conflict policy: the child's needs win on staples; the grown-ups' preferences win on discretionary items.
import { listJoin } from './util.js';

const TAG_WORDS = {
  flour: 'flour',
  dairy: 'dairy',
  'ultra-processed': 'processed',
  caffeine: 'caffeine',
  spicy: 'spice',
};

export const tagWords = tags => tags.map(t => TAG_WORDS[t] ?? t);

export function canEat(member, product) {
  const tags = product.tags ?? [];
  const blocked = [...(member.avoid ?? []), ...(member.limit ?? [])];
  return !blocked.some(t => tags.includes(t));
}

export function brokenRules(member, product) {
  const tags = product.tags ?? [];
  return [...(member.avoid ?? []), ...(member.limit ?? [])].filter(t => tags.includes(t));
}

export function decide(product, household) {
  const members = household.members;
  const adults = members.filter(m => m.role === 'adult');
  const child = members.find(m => m.role === 'child');
  const eaters = members.filter(m => canEat(m, product)).map(m => m.id);

  if (product.kind === 'discretionary') {
    const vetoes = adults.filter(a => !eaters.includes(a.id));
    if (vetoes.length) {
      const rules = [...new Set(vetoes.flatMap(a => brokenRules(a, product)))];
      return {
        include: false,
        eaters,
        lane: null,
        rule: 'adults-win-discretionary',
        why: `Treats are the grown-ups' call, and this one's ${listJoin(tagWords(rules))}.`,
      };
    }
  }

  if (!eaters.length) {
    return { include: false, eaters, lane: null, rule: 'nobody', why: 'Nobody in the house eats this.' };
  }

  const adultIds = adults.map(a => a.id);
  let lane = 'mixed';
  if (eaters.length === members.length) lane = 'everyone';
  else if (eaters.every(id => adultIds.includes(id))) lane = 'adults';
  else if (child && eaters.length === 1 && eaters[0] === child.id) lane = 'child';

  let why = '';
  let rule = null;
  if (lane === 'child') {
    const needed = (child.needs ?? []).filter(t => product.tags.includes(t));
    const adultRules = [...new Set(adults.flatMap(a => brokenRules(a, product)))];
    rule = needed.length ? 'child-wins-staples' : 'child-only';
    why = needed.length
      ? `Grown-ups skip the ${listJoin(tagWords(adultRules))}. She needs it, so it's hers.`
      : 'Only she eats it.';
  } else if (lane === 'adults') {
    const childRules = child ? brokenRules(child, product) : [];
    rule = 'adults-only';
    why = childRules.length ? `Not for her: ${listJoin(tagWords(childRules))}.` : 'Grown-ups only.';
  }

  return { include: true, eaters, lane, rule, why };
}

export function memberById(household, id) {
  return household.members.find(m => m.id === id);
}
