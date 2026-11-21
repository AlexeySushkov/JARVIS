import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, clampRating } from '../lib/slots.js';

test('14 слотов, первый 6-7, последний 23-6', () => {
  assert.equal(SLOTS.length, 14);
  assert.equal(SLOTS[0].id, '6-7');
  assert.equal(SLOTS[13].id, '23-6');
  assert.equal(SLOTS[13].end, '06:00');
});

test('clampRating: границы и кламп', () => {
  assert.equal(clampRating(5), 5);
  assert.equal(clampRating(0), 0);
  assert.equal(clampRating(10), 10);
  assert.equal(clampRating(11), 10);
  assert.equal(clampRating(-1), 0);
  assert.equal(clampRating(3.7), 4);
  assert.equal(clampRating(null), null);
  assert.equal(clampRating(undefined), null);
});
