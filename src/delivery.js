// One-off delivery slots, never a subscription. Pantry books as late as it can while still landing
// before the first thing in the cart runs out: fresher food, fewer days to cover.
import { addHours, hm, hoursLabel, longDate, weekday, windowLabel } from './util.js';

const hhmm = ({ h, m }) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
export const windowOf = slot => `${hhmm(hm(slot.start))}-${hhmm(hm(slot.end))}`;

export function describeSlot(slot, { runOut = null, family = null } = {}) {
  if (!slot) return null;
  return {
    ...slot,
    day: weekday(slot.start),
    date: longDate(slot.start),
    window: windowLabel(slot.start, slot.end),
    oneOff: true,
    family,
    runOut,
    landsBefore: runOut ? hoursLabel((new Date(runOut) - new Date(slot.end)) / 3_600_000) : null,
  };
}

export function pickSlot({ slots, household, now, runOut = null, family = null }) {
  const preferred = household.delivery?.preferredWindows ?? [];
  const buffer = household.delivery?.landBeforeRunOutHours ?? 1.5;
  const deadline = runOut ? addHours(runOut, -buffer) : null;
  const open = slots.filter(s => new Date(s.start) > addHours(now, 2));
  const fits = open
    .filter(s => !preferred.length || preferred.includes(windowOf(s)))
    .filter(s => !deadline || new Date(s.end) <= deadline)
    .sort((a, b) => new Date(b.end) - new Date(a.end));
  const pick = fits[0] ?? open.sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  return describeSlot(pick, { runOut, family });
}

// Next week's draft keeps the rhythm: same window, seven days on.
export function slotWeekAfter(slots, slot) {
  if (!slot) return null;
  const target = new Date(slot.start).getTime() + 7 * 86_400_000;
  const match = slots.find(s => Math.abs(new Date(s.start).getTime() - target) <= 2 * 3_600_000);
  return describeSlot(match ?? null);
}
