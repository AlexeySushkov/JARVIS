import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswer } from '../lib/jarvis.js';
import { buildDayViewModel } from '../lib/view.js';

test('parseAnswer v1: локальный pass-through с trim', () => {
  assert.deepEqual(parseAnswer('  Спала до 7  '), { activity: 'Спала до 7' });
});

test('buildDayViewModel: слоты в порядке SLOTS, данные по slotId', () => {
  const vm = buildDayViewModel({ date: '2026-11-21', mood: 7, slots: [
    { slotId: '7-8', activity: 'Завтрак', pleasure: 6, importance: 6 },
  ] });
  assert.equal(vm.length, 14);
  assert.equal(vm[0].slotId, '6-7');
  assert.equal(vm[0].activity, null);
  assert.equal(vm[1].activity, 'Завтрак');
});
