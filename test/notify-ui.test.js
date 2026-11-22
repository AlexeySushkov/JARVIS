import test from 'node:test';
import assert from 'node:assert/strict';
import { permissionLabel } from '../lib/notify-ui.js';

test('permissionLabel: русские подписи статусов', () => {
  assert.equal(permissionLabel('granted'), 'разрешено');
  assert.equal(permissionLabel('denied'), 'запрещено');
  assert.equal(permissionLabel('default'), 'не запрошено');
  assert.equal(permissionLabel('unsupported'), 'не поддерживается');
});
