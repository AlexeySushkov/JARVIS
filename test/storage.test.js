import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { getDay, putDay, getAllDays } from '../lib/storage.js';

test('putDay сохраняет, getDay читает, повторная запись перезаписывает', async () => {
  await putDay({ date: '2026-11-21', mood: 6, slots: [] });
  await putDay({ date: '2026-11-21', mood: 7, slots: [] });
  const day = await getDay('2026-11-21');
  assert.equal(day.mood, 7);
});

test('getAllDays возвращает отсортированные дни', async () => {
  await putDay({ date: '2026-11-20', mood: null, slots: [] });
  await putDay({ date: '2026-11-21', mood: null, slots: [] });
  const days = await getAllDays();
  assert.deepEqual(days.map(d => d.date), ['2026-11-20', '2026-11-21']);
});

test('getDay для отсутствующего дня возвращает null', async () => {
  assert.equal(await getDay('1999-01-01'), null);
});
