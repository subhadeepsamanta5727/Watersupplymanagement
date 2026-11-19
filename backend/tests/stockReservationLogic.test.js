const test = require('node:test');
const assert = require('node:assert/strict');

test('stock reservation logic: reserves on order, fulfills on delivery, and refunds on cancel', () => {
  // Simulate Product state
  let product = {
    name: '20L Water Jar',
    stock: 5,
    pendingDeliveryStock: 0
  };

  // 1. Customer ABC orders 2 jars
  const orderABC = { requestedQty: 2 };
  assert.ok(product.stock >= orderABC.requestedQty, 'Stock must be sufficient');
  product.stock -= orderABC.requestedQty;
  product.pendingDeliveryStock += orderABC.requestedQty;

  assert.equal(product.stock, 3);
  assert.equal(product.pendingDeliveryStock, 2);

  // 2. Customer XYZ tries to order 4 jars -> Rejected because available stock is only 3
  const orderXYZ = { requestedQty: 4 };
  const canXYZOrder = product.stock >= orderXYZ.requestedQty;
  assert.equal(canXYZOrder, false, 'XYZ order of 4 must be rejected when only 3 are available');

  // 3. Customer XYZ orders 3 jars -> Accepted
  orderXYZ.requestedQty = 3;
  product.stock -= orderXYZ.requestedQty;
  product.pendingDeliveryStock += orderXYZ.requestedQty;

  assert.equal(product.stock, 0);
  assert.equal(product.pendingDeliveryStock, 5);

  // 4. Any new order is now rejected
  assert.equal(product.stock >= 1, false, 'Stock is 0, no new orders accepted');

  // 5. Agent marks ABC as delivered with partial delivery: delivered 1 out of 2
  const deliveredQty = 1;
  const undeliveredQty = Math.max(0, orderABC.requestedQty - deliveredQty);
  product.pendingDeliveryStock = Math.max(0, product.pendingDeliveryStock - orderABC.requestedQty);
  product.stock += undeliveredQty;

  assert.equal(product.pendingDeliveryStock, 3);
  assert.equal(product.stock, 1, '1 undelivered jar is returned to available stock');

  // 6. XYZ order is cancelled before delivery
  product.stock += orderXYZ.requestedQty;
  product.pendingDeliveryStock = Math.max(0, product.pendingDeliveryStock - orderXYZ.requestedQty);

  assert.equal(product.stock, 4);
  assert.equal(product.pendingDeliveryStock, 0);
});
