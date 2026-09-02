import assert from 'node:assert/strict';
import test from 'node:test';
import { getEffectiveSetupTime } from './shot-list.ts';

test('exports the director override instead of the AI estimate', () => {
  assert.equal(
    getEffectiveSetupTime({
      setupTime: '10–25 min',
      setupTimeOverride: '20 min on this location',
    }),
    '20 min on this location',
  );
});

test('falls back to the AI estimate for blank or legacy overrides', () => {
  assert.equal(
    getEffectiveSetupTime({ setupTime: '10–25 min', setupTimeOverride: '  ' }),
    '10–25 min',
  );
  assert.equal(
    getEffectiveSetupTime({ setupTime: '10–25 min', setupTimeOverride: null }),
    '10–25 min',
  );
});