const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const AgentSettlement = require('../models/AgentSettlement');
const { getAgents } = require('../controllers/vendorController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('returns existing vendor agents with settlement summaries', async () => {
  const originals = {
    userFind: User.find,
    paymentAggregate: Payment.aggregate,
    orderAggregate: Order.aggregate,
    settlementFind: AgentSettlement.find
  };
  const agent = {
    _id: 'agent-123',
    toObject: () => ({ _id: 'agent-123', name: 'Existing Agent', phone: '1234567890' })
  };

  User.find = () => ({
    select() { return this; },
    sort: async () => [agent]
  });
  Payment.aggregate = async () => [];
  Order.aggregate = async () => [];
  AgentSettlement.find = () => ({
    sort() { return this; },
    select() { return this; },
    lean: async () => []
  });

  try {
    const res = createResponse();
    await getAgents({ user: { _id: 'vendor-123' } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data[0].name, 'Existing Agent');
    assert.equal(res.body.data[0].todayCash, 0);
    assert.equal(res.body.data[0].pendingJars, 0);
  } finally {
    User.find = originals.userFind;
    Payment.aggregate = originals.paymentAggregate;
    Order.aggregate = originals.orderAggregate;
    AgentSettlement.find = originals.settlementFind;
  }
});
