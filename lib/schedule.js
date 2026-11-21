import { addDays, localDayKeyFromUtc } from './dates.js';

export const REMINDERS = [
  { slotId: '6-7',   time: '07:05', dayOffset: 0 },
  { slotId: '7-8',   time: '08:05', dayOffset: 0 },
  { slotId: '8-9',   time: '09:05', dayOffset: 0 },
  { slotId: '9-11',  time: '11:05', dayOffset: 0 },
  { slotId: '11-13', time: '13:05', dayOffset: 0 },
  { slotId: '13-15', time: '15:05', dayOffset: 0 },
  { slotId: '15-17', time: '17:05', dayOffset: 0 },
  { slotId: '17-18', time: '18:05', dayOffset: 0 },
  { slotId: '18-19', time: '19:05', dayOffset: 0 },
  { slotId: '19-20', time: '20:05', dayOffset: 0 },
  { slotId: '20-21', time: '21:05', dayOffset: 0 },
  { slotId: '21-22', time: '22:05', dayOffset: 0 },
  { slotId: '22-23', time: '23:00', dayOffset: 0 },
  { slotId: '23-6',  time: '07:00', dayOffset: -1 },
  { slotId: 'mood',  time: '21:30', dayOffset: 0 },
];

export const REMINDER_WINDOW_MINUTES = 5;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function minutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function withinWindow(nowHhmm, tHhmm, winMin) {
  const now = minutesSinceMidnight(nowHhmm);
  const t = minutesSinceMidnight(tHhmm);
  return now >= t && now < t + winMin;
}

export function dueReminders(nowUtcMs, offsetMinutes) {
  const shifted = new Date(nowUtcMs + offsetMinutes * 60000);
  const hhmm = `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
  const localKey = localDayKeyFromUtc(nowUtcMs, offsetMinutes);
  const out = [];
  for (const r of REMINDERS) {
    if (withinWindow(hhmm, r.time, REMINDER_WINDOW_MINUTES)) {
      out.push({ slotId: r.slotId, targetDayKey: addDays(localKey, r.dayOffset) });
    }
  }
  return out;
}
