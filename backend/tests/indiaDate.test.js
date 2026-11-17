const test = require('node:test');
const assert = require('node:assert/strict');
const { getIndiaDayBounds } = require('../utils/indiaDate');

test('returns the India calendar day boundaries independently of server timezone', () => {
  const { start, end } = getIndiaDayBounds(new Date('2026-11-16T18:25:00.000Z'));

  assert.equal(start.toISOString(), '2026-11-15T18:30:00.000Z');
  assert.equal(end.toISOString(), '2026-11-16T18:30:00.000Z');
});
