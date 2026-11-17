const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isAssignedAgentForOrder,
  canAgentUpdateOrder
} = require('../utils/deliveryAgentAccess');
const { validateAgentCashCollection } = require('../utils/agentCash');

const agent = {
  _id: 'agent-1',
  role: 'agent',
  vendorId: 'vendor-1'
};

const order = {
  vendorId: 'vendor-1',
  deliveryAgentId: 'agent-1'
};

test('allows an agent to access an order assigned by their vendor', () => {
  assert.equal(isAssignedAgentForOrder(agent, order), true);
});

test('rejects orders assigned to another agent or belonging to another vendor', () => {
  assert.equal(isAssignedAgentForOrder(agent, { ...order, deliveryAgentId: 'agent-2' }), false);
  assert.equal(isAssignedAgentForOrder(agent, { ...order, vendorId: 'vendor-2' }), false);
  assert.equal(isAssignedAgentForOrder({ ...agent, role: 'customer' }, order), false);
});

test('allows agents to submit only a delivered status and no accounting fields', () => {
  assert.equal(canAgentUpdateOrder({ status: 'delivered' }), true);
  assert.equal(canAgentUpdateOrder({ status: 'cancelled' }), false);
  assert.equal(canAgentUpdateOrder({
    status: 'delivered',
    products: [{ productId: 'product-1', deliveredQuantity: 2 }],
    bottlesReturned: 1,
    cashCollected: 25,
    deliveryNotes: 'Left at security gate'
  }), true);
  assert.equal(canAgentUpdateOrder({ status: 'delivered', paymentMethod: 'cash' }), false);
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
