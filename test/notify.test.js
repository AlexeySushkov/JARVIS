import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushPayload, isCronAuthorized } from '../api/notify.js';
import { addSubscription } from '../api/subscribe.js';

test('buildPushPayload: суточное напоминание с датой дня', () => {
  const p = buildPushPayload('2026-11-22');
  assert.equal(p.title, 'JARVIS');
  assert.ok(p.body.includes('Заполни дневник'));
  assert.equal(p.data.targetDayKey, '2026-11-22');
  assert.equal(p.data.slotId, 'mood');
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
