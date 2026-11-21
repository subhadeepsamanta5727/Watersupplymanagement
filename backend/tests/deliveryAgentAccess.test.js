const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isAgentForVendorOrder,
  canAgentUpdateOrder
} = require('../utils/deliveryAgentAccess');
const {
  validateAgentCashCollection,
  validateAgentPaymentCollection
} = require('../utils/agentCash');

const agent = {
  _id: 'agent-1',
  role: 'agent',
  vendorId: 'vendor-1'
};

const order = {
  vendorId: 'vendor-1',
  deliveryAgentId: 'agent-1'
};

test('allows agents to complete any delivery belonging to their vendor', () => {
  assert.equal(isAgentForVendorOrder(agent, order), true);
  assert.equal(isAgentForVendorOrder(agent, { vendorId: 'vendor-1', deliveryAgentId: null }), true);
  assert.equal(isAgentForVendorOrder(agent, { ...order, deliveryAgentId: 'agent-2' }), true);
  assert.equal(isAgentForVendorOrder(agent, { ...order, vendorId: 'vendor-2' }), false);
  assert.equal(isAgentForVendorOrder({ ...agent, role: 'customer' }, order), false);
});

test('allows agents to submit delivery quantities and supported collection methods only', () => {
  assert.equal(canAgentUpdateOrder({ status: 'delivered' }), true);
  assert.equal(canAgentUpdateOrder({ status: 'cancelled' }), false);
  assert.equal(canAgentUpdateOrder({
    status: 'delivered',
    products: [{ productId: 'product-1', deliveredQuantity: 2 }],
    bottlesReturned: 1,
    cashCollected: 25,
    paymentMethod: 'cash',
    deliveryNotes: 'Left at security gate'
  }), true);
  assert.equal(canAgentUpdateOrder({ status: 'delivered', paymentMethod: 'online' }), true);
  assert.equal(canAgentUpdateOrder({ status: 'delivered', paymentMethod: 'due' }), true);
  assert.equal(canAgentUpdateOrder({ status: 'delivered', paymentMethod: 'other' }), false);
  assert.equal(canAgentUpdateOrder({
    status: 'delivered',
    products: [{ productId: 'product-1', deliveredQuantity: 1.5 }]
  }), false);
});

test('records partial cash without allowing collection above delivery charge or amount due', () => {
  assert.equal(validateAgentCashCollection(30, 100, 80), 30);
  assert.equal(validateAgentCashCollection(undefined, 100, 80), 0);
  assert.throws(() => validateAgentCashCollection(101, 100, 200), { statusCode: 400 });
  assert.throws(() => validateAgentCashCollection(50, 100, 25), { statusCode: 400 });
});

test('due payment method leaves the collection at zero', () => {
  assert.equal(validateAgentPaymentCollection('due', 0, 100, 100), 0);
  assert.throws(() => validateAgentPaymentCollection('due', 10, 100, 100), { statusCode: 400 });
  assert.equal(validateAgentPaymentCollection('online', 25, 100, 100), 25);
  assert.throws(() => validateAgentPaymentCollection('other', 0, 100, 100), { statusCode: 400 });
});
