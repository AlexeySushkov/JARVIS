import test from 'node:test';
import assert from 'node:assert/strict';
import { REMINDERS, REMINDER_WINDOW_MINUTES, dueReminders } from '../lib/schedule.js';

test('15 напоминаний: 14 слотов + mood', () => {
  assert.equal(REMINDERS.length, 15);
  assert.equal(REMINDERS.filter(r => r.slotId === 'mood').length, 1);
});

test('dueReminders: слот 6-7 due ровно в 07:05 местного', () => {
  const nowUtc = Date.UTC(2026, 10, 21, 4, 5); // 07:05 при offset +180
  const due = dueReminders(nowUtc, 180);
  assert.deepEqual(due, [{ slotId: '6-7', targetDayKey: '2026-11-21' }]);
});

test('dueReminders: 23-6 утром пишется во вчерашний день', () => {
  const nowUtc = Date.UTC(2026, 10, 21, 4, 0); // 07:00 при offset +180
  const due = dueReminders(nowUtc, 180);
  assert.deepEqual(due, [{ slotId: '23-6', targetDayKey: '2026-11-20' }]);
});

test('dueReminders: окно 5 минут — вне окна пусто', () => {
  const before = Date.UTC(2026, 10, 21, 18, 29); // 21:29 при offset +180
  const after  = Date.UTC(2026, 10, 21, 18, 35); // 21:35
  assert.deepEqual(dueReminders(before, 180), []);
  assert.deepEqual(dueReminders(after, 180), []);
  assert.ok(REMINDER_WINDOW_MINUTES === 5);
});

test('тихие часы: 22-23 спрашивается в 22:55, в 23:00 пусто', () => {
  const at2255 = Date.UTC(2026, 10, 21, 19, 55); // 22:55 при offset +180
  assert.deepEqual(dueReminders(at2255, 180), [{ slotId: '22-23', targetDayKey: '2026-11-21' }]);
  const at2300 = Date.UTC(2026, 10, 21, 20, 0); // 23:00
  assert.deepEqual(dueReminders(at2300, 180), []);
});
