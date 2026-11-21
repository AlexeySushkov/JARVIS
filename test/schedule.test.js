import test from 'node:test';
import assert from 'node:assert/strict';
import { REMINDERS, REMINDER_WINDOW_MINUTES, dueReminders } from '../lib/schedule.js';

test('15 напоминаний: 14 слотов + mood, окно 60 минут', () => {
  assert.equal(REMINDERS.length, 15);
  assert.equal(REMINDERS.filter(r => r.slotId === 'mood').length, 1);
  assert.equal(REMINDER_WINDOW_MINUTES, 60);
});

test('dueReminders: в 07:00 — 6-7 сегодня, 22-23 и 23-6 вчера', () => {
  const nowUtc = Date.UTC(2026, 10, 21, 4, 0); // 07:00 при offset +180
  assert.deepEqual(dueReminders(nowUtc, 180), [
    { slotId: '6-7', targetDayKey: '2026-11-21' },
    { slotId: '22-23', targetDayKey: '2026-11-20' },
    { slotId: '23-6', targetDayKey: '2026-11-20' },
  ]);
});

test('dueReminders: окно 1 час — в 08:00 только 7-8', () => {
  const at800 = Date.UTC(2026, 10, 21, 5, 0); // 08:00
  assert.deepEqual(dueReminders(at800, 180), [{ slotId: '7-8', targetDayKey: '2026-11-21' }]);
});

test('тихие часы: в 23:00 и 03:00 пусто', () => {
  const at2300 = Date.UTC(2026, 10, 21, 20, 0); // 23:00
  assert.deepEqual(dueReminders(at2300, 180), []);
  const at300 = Date.UTC(2026, 10, 21, 0, 0); // 03:00
  assert.deepEqual(dueReminders(at300, 180), []);
});
