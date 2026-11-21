import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeHistory } from '../lib/export.js';

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
