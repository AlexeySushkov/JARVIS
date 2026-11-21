import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushPayload } from '../api/notify.js';

test('buildPushPayload: текст по слоту и mood', () => {
  const slot = buildPushPayload({ slotId: '6-7', targetDayKey: '2026-11-21' });
  assert.equal(slot.title, 'JARVIS');
  assert.ok(slot.body.includes('6 до 7'));
  assert.equal(slot.data.slotId, '6-7');
  const mood = buildPushPayload({ slotId: 'mood', targetDayKey: '2026-11-21' });
  assert.ok(mood.body.includes('настроение'));
});
