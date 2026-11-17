const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocateDeliveredQuantities,
  validateDeliveredQuantities,
  validateReturnedJarCount
} = require('../utils/orderQuantities');

test('allocates partial delivery across multiple requested items without changing requests', () => {
  const products = [
    { requestedQuantity: 3, quantity: 3 },
    { requestedQuantity: 4, quantity: 4 }
  ];

  const delivered = allocateDeliveredQuantities(products, 5);

  assert.deepEqual(delivered, [3, 2]);
  assert.deepEqual(products.map((item) => item.quantity), [3, 4]);
  assert.equal(validateDeliveredQuantities(products, delivered, 5), 5);
});

test('validates explicit per-product delivery and rejects over-delivery', () => {
  const products = [
    { requestedQuantity: 2, quantity: 2, deliveredQuantity: 1 },
    { requestedQuantity: 3, quantity: 3, deliveredQuantity: 2 }
  ];

  assert.deepEqual(allocateDeliveredQuantities(products, 3), [1, 2]);
  assert.throws(() => validateDeliveredQuantities(products, [3, 2], 5), {
    statusCode: 400
  });
});

test('allows returns of previously outstanding jars plus newly delivered jars', () => {
  assert.equal(validateReturnedJarCount(4, 3, 1), 4);
  assert.throws(() => validateReturnedJarCount(4, 3, 0), { statusCode: 400 });
  assert.throws(() => validateReturnedJarCount(1, -1, 2), { statusCode: 409 });
});
