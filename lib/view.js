import { SLOTS } from './slots.js';

export function buildDayViewModel(day) {
  const slots = (day && day.slots) || [];
  return SLOTS.map((s) => {
    const filled = slots.find((x) => x.slotId === s.id);
    return {
      slotId: s.id,
      start: s.start,
      end: s.end,
      activity: filled ? filled.activity : null,
      pleasure: filled ? filled.pleasure : null,
      importance: filled ? filled.importance : null,
    };
  });
}
