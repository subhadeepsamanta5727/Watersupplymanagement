const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { deleteAgent, updateAgentStatus } = require('../controllers/vendorController');

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

const installDeleteMocks = ({ pendingCash = 0, pendingJars = 0 } = {}) => {
  const agentId = new mongoose.Types.ObjectId();
  const vendorId = new mongoose.Types.ObjectId();
  const agent = { _id: agentId, name: 'Test Agent' };
  const calls = {};
  const originals = {
    startSession: mongoose.startSession,
    userFindOne: User.findOne,
    userDeleteOne: User.deleteOne,
    paymentAggregate: Payment.aggregate,
    orderAggregate: Order.aggregate,
    orderUpdateMany: Order.updateMany
  };
  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {}
  };

  mongoose.startSession = async () => session;
  User.findOne = () => ({ session: async () => agent });
  User.deleteOne = async (filter, options) => {
    calls.delete = { filter, options };
    return { deletedCount: 1 };
  };
  Payment.aggregate = () => ({
    session: async () => pendingCash > 0 ? [{ total: pendingCash }] : []
  });
  Order.aggregate = () => ({
    session: async () => pendingJars > 0 ? [{ total: pendingJars }] : []
  });
  Order.updateMany = async (filter, update, options) => {
    calls.unassign = { filter, update, options };
    return { modifiedCount: 1 };
  };

  return {
    agentId,
    vendorId,
    calls,
    restore() {
      mongoose.startSession = originals.startSession;
      User.findOne = originals.userFindOne;
      User.deleteOne = originals.userDeleteOne;
      Payment.aggregate = originals.paymentAggregate;
      Order.aggregate = originals.orderAggregate;
      Order.updateMany = originals.orderUpdateMany;
    }
  };
};

const runDeleteAgent = async (balances) => {
  const mocks = installDeleteMocks(balances);
  const res = createResponse();
  try {
    await deleteAgent({
      params: { agentId: mocks.agentId.toString() },
      user: { _id: mocks.vendorId }
    }, res);
    return { ...mocks, res };
  } catch (error) {
    mocks.restore();
    throw error;
  }
};

test('prevents permanent agent removal while cash remains unsettled', async () => {
  const result = await runDeleteAgent({ pendingCash: 250 });
  try {
    assert.equal(result.res.statusCode, 409);
    assert.match(result.res.body.message, /cash: ₹250\.00, jars: 0/);
    assert.equal(result.calls.delete, undefined);
    assert.equal(result.calls.unassign, undefined);
  } finally {
    result.restore();
  }
});

test('prevents permanent agent removal while jars remain unsettled', async () => {
  const result = await runDeleteAgent({ pendingJars: 3 });
  try {
    assert.equal(result.res.statusCode, 409);
    assert.match(result.res.body.message, /cash: ₹0\.00, jars: 3/);
    assert.equal(result.calls.delete, undefined);
    assert.equal(result.calls.unassign, undefined);
  } finally {
    result.restore();
  }
});

test('deletes an agent only after settlement and returns pending orders to the open queue', async () => {
  const result = await runDeleteAgent();
  try {
    assert.equal(result.res.statusCode, 200);
    assert.equal(result.res.body.success, true);
    assert.equal(result.calls.delete.filter.vendorId.toString(), result.vendorId.toString());
    assert.equal(result.calls.unassign.filter.status, 'pending');
    assert.deepEqual(result.calls.unassign.update, { $set: { deliveryAgentId: null } });
  } finally {
    result.restore();
  }
});

test('updates active status only for an agent owned by the vendor', async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate;
  const agentId = new mongoose.Types.ObjectId();
  const vendorId = new mongoose.Types.ObjectId();
  let update;
  User.findOneAndUpdate = async (filter, changes, options) => {
    assert.equal(filter.vendorId.toString(), vendorId.toString());
    assert.equal(filter.role, 'agent');
    assert.deepEqual(options, { new: true, runValidators: true });
    update = changes;
    return { _id: agentId, name: 'Test Agent', isActive: changes.$set.isActive };
  };

  try {
    const res = createResponse();
    await updateAgentStatus({
      params: { agentId: agentId.toString() },
      body: { isActive: false },
      user: { _id: vendorId }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(update, { $set: { isActive: false } });
    assert.equal(res.body.data.isActive, false);
  } finally {
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
