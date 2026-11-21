const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allocateDeliveredQuantities,
  getPendingOrderQuantityDeltas,
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

test('calculates pending-order stock deltas for changed, removed, and added products', () => {
  const deltas = getPendingOrderQuantityDeltas(
    [
      { productId: 'jar', quantity: 2 },
      { productId: 'tap', requestedQuantity: 3, quantity: 3 }
    ],
    [
      { productId: 'jar', quantity: 5 },
      { productId: 'pack', quantity: 4 }
    ]
  );

  assert.deepEqual(deltas, [
    { productId: 'jar', delta: 3 },
    { productId: 'tap', delta: -3 },
    { productId: 'pack', delta: 4 }
  ]);
  assert.deepEqual(
    getPendingOrderQuantityDeltas([{ productId: 'jar', quantity: 5 }], [{ productId: 'jar', quantity: 5 }]),
    []
  );
});
