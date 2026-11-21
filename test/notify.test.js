import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushPayload, isCronAuthorized } from '../api/notify.js';
import { addSubscription } from '../api/subscribe.js';

test('buildPushPayload: текст по слоту и mood', () => {
  const slot = buildPushPayload({ slotId: '6-7', targetDayKey: '2026-11-21' });
  assert.equal(slot.title, 'JARVIS');
  assert.ok(slot.body.includes('6 до 7'));
  assert.equal(slot.data.slotId, '6-7');
  const mood = buildPushPayload({ slotId: 'mood', targetDayKey: '2026-11-21' });
  assert.ok(mood.body.includes('настроение'));
});

test('isCronAuthorized: требует Bearer-секрет', () => {
  assert.equal(isCronAuthorized({ authorization: 'Bearer s3cret' }, 's3cret'), true);
  assert.equal(isCronAuthorized({ authorization: 'Bearer wrong' }, 's3cret'), false);
  assert.equal(isCronAuthorized({}, 's3cret'), false);
  assert.equal(isCronAuthorized({ authorization: 'Bearer s3cret' }, ''), false);
});

test('addSubscription: дедуп по endpoint и ограничение размера', () => {
  const e = (id) => ({ subscription: { endpoint: 'ep' + id } });
  const next = addSubscription([e(1), e(2)], e(1), 10);
  assert.equal(next.length, 2);
  assert.equal(next.filter((s) => s.subscription.endpoint === 'ep1').length, 1);

  const big = Array.from({ length: 12 }, (_, i) => e(i));
  const capped = addSubscription(big, e('new'), 10);
  assert.equal(capped.length, 10);
});
