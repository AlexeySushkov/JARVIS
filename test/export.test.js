import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeWeekDoc } from '../lib/export.js';

const week = [
  { date: '2026-11-16', mood: 7, slots: [{ slotId: '6-7', activity: 'Сон', pleasure: 7, importance: 8 }] },
  { date: '2026-11-17', mood: null, slots: [] },
  { date: '2026-11-18', mood: null, slots: [] },
  { date: '2026-11-19', mood: null, slots: [] },
  { date: '2026-11-20', mood: 5, slots: [] },
  { date: '2026-11-21', mood: null, slots: [] },
  { date: '2026-11-22', mood: null, slots: [] },
];

test('serializeWeekDoc: все 7 дней недели, включая пустые', () => {
  const doc = serializeWeekDoc(week);
  assert.ok(doc.startsWith('<!DOCTYPE html>'));
  for (const day of ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']) {
    assert.ok(doc.includes(day), `нет дня: ${day}`);
  }
});

test('serializeWeekDoc: колонки как в образце и все 14 слотов', () => {
  const doc = serializeWeekDoc(week);
  assert.ok(doc.includes('Время'));
  assert.ok(doc.includes('Дело'));
  assert.ok(doc.includes('удовольствие (0-10)'));
  assert.ok(doc.includes('Важность (0-10)'));
  assert.ok(doc.includes('6-7'));
  assert.ok(doc.includes('23-6.00'));
});

test('serializeWeekDoc: данные и настроение на месте, пустые дни без краша', () => {
  const doc = serializeWeekDoc(week);
  assert.ok(doc.includes('Сон'));
  assert.ok(doc.includes('Настроение дня'));
  assert.ok(doc.includes('Настроение дня — 7'));
  assert.ok(doc.includes('Настроение дня — 5'));
});

test('serializeWeekDoc: экранирует HTML', () => {
  const doc = serializeWeekDoc([{ date: '2026-11-20', mood: null, slots: [{ slotId: '6-7', activity: '<script>', pleasure: null, importance: null }] }]);
  assert.ok(doc.includes('&lt;script&gt;'));
  assert.ok(!doc.includes('<script>'));
});
