import test from 'node:test';
import assert from 'node:assert/strict';
import { formatVersion, formatBuild, formatBuildDate } from '../lib/version.js';

test('formatVersion: версия + коммит + дата', () => {
  assert.equal(
    formatVersion('v1.0.0', { commit: 'c0ffee', date: '2026-11-22T10:00:00Z' }),
    'v1.0.0 · c0ffee · 22.11.2026',
  );
});

test('formatVersion: без данных о сборке — только версия', () => {
  assert.equal(formatVersion('v1.0.0', null), 'v1.0.0');
  assert.equal(formatVersion('v1.0.0', {}), 'v1.0.0');
});

test('formatBuild: коммит и дата; пусто без данных', () => {
  assert.equal(formatBuild({ commit: 'c0ffee', date: '2026-11-22T10:00:00Z' }), 'c0ffee · 22.11.2026');
  assert.equal(formatBuild({ commit: 'c0ffee' }), 'c0ffee');
  assert.equal(formatBuild(null), '');
});

test('formatBuildDate: некорректная дата → пусто', () => {
  assert.equal(formatBuildDate('2026-11-22T10:00:00Z'), '22.11.2026');
  assert.equal(formatBuildDate(''), '');
  assert.equal(formatBuildDate('not-a-date'), '');
});
