import test from 'node:test';
import assert from 'node:assert/strict';
import { permissionLabel, formatSchedule } from '../lib/notify-ui.js';

test('permissionLabel: русские подписи статусов', () => {
  assert.equal(permissionLabel('granted'), 'разрешено');
  assert.equal(permissionLabel('denied'), 'запрещено');
  assert.equal(permissionLabel('default'), 'не запрошено');
  assert.equal(permissionLabel('unsupported'), 'не поддерживается');
});

test('formatSchedule: время UTC переводится в местное', () => {
  assert.equal(formatSchedule(17, 0, 180), '20:00'); // МСК
  assert.equal(formatSchedule(17, 0, -300), '12:00');
  assert.equal(formatSchedule(17, 0, 0), '17:00');
  assert.equal(formatSchedule(23, 0, 180), '02:00'); // переход через полночь
});
