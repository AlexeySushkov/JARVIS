import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, addDays, localDayKeyFromUtc } from '../lib/dates.js';

test('dayKey формат YYYY-MM-DD', () => {
  assert.equal(dayKey(new Date(2026, 10, 21)), '2026-11-21'); // месяцы 0-based
});

test('addDays через границу года', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('localDayKeyFromUtc с учётом смещения', () => {
  // 2026-11-21T02:00Z + offset 180 мин (UTC+3) = 21.11 05:00 местного
  const nowUtc = Date.UTC(2026, 10, 21, 2, 0);
  assert.equal(localDayKeyFromUtc(nowUtc, 180), '2026-11-21');
  // 2026-11-20T22:00Z + 180 = 21.11 01:00 местного
  assert.equal(localDayKeyFromUtc(Date.UTC(2026, 10, 20, 22, 0), 180), '2026-11-21');
});
