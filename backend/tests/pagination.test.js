const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination } = require('../utils/pagination');

test('leaves legacy requests unpaginated and parses explicit page parameters', () => {
  assert.equal(parsePagination({}), null);
  assert.deepEqual(parsePagination({ page: '2', limit: '50' }), { page: 2, limit: 50 });
});

test('rejects invalid pagination bounds', () => {
  assert.throws(() => parsePagination({ page: '0', limit: '20' }), { statusCode: 400 });
  assert.throws(() => parsePagination({ page: '1', limit: '101' }), { statusCode: 400 });
});
