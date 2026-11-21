import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeHistory, serializeWeekDoc } from '../lib/export.js';

const records = [
  { date: '2026-11-20', mood: 7, slots: [
    { slotId: '6-7', activity: 'Сон', pleasure: 7, importance: 8 },
    { slotId: '7-8', activity: null, pleasure: null, importance: null },
  ] },
];

test('JSON: корректный объект с пустыми значениями', () => {
  const parsed = JSON.parse(serializeHistory(records, 'json'));
  assert.equal(parsed[0].date, '2026-11-20');
  assert.equal(parsed[0].slots[1].activity, null);
});

test('CSV: заголовок и строка с пустым слотом', () => {
  const csv = serializeHistory(records, 'csv');
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('date;slotId;activity;pleasure;importance;mood'));
  assert.ok(csv.includes('2026-11-20;7-8;;;'));
});

test('JSON/CSV не ломаются на пустом массиве', () => {
  assert.equal(serializeHistory([], 'json'), '[]');
  assert.ok(serializeHistory([], 'csv').includes('date;slotId'));
});

test('serializeWeekDoc: HTML с таблицей и настроением', () => {
  const doc = serializeWeekDoc([{ date: '2026-11-20', mood: 7, slots: [{ slotId: '6-7', activity: 'Сон', pleasure: 7, importance: 8 }] }]);
  assert.ok(doc.startsWith('<html>'));
  assert.ok(doc.includes('Дневник — неделя'));
  assert.ok(doc.includes('Сон'));
  assert.ok(doc.includes('Настроение дня: 7'));
  assert.ok(doc.includes('Время'));
});

test('serializeWeekDoc: экранирует HTML', () => {
  const doc = serializeWeekDoc([{ date: '2026-11-20', mood: null, slots: [{ slotId: '6-7', activity: '<script>', pleasure: null, importance: null }] }]);
  assert.ok(doc.includes('&lt;script&gt;'));
  assert.ok(!doc.includes('<script>'));
});
