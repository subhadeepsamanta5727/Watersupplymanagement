const test = require('node:test');
const assert = require('node:assert/strict');
const Expense = require('../models/Expense');
const { createExpense } = require('../controllers/expenseController');

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

test('records a vendor expense with the selected date and normalized details', async () => {
  const originalCreate = Expense.create;
  let createdData;
  Expense.create = async (data) => {
    createdData = data;
    return data;
  };

  try {
    const res = createResponse();
    await createExpense({
      user: { _id: 'vendor-123' },
      body: {
        expenseType: '  Fuel ',
        name: ' Delivery van ',
        amount: '125.50',
        expenseDate: '2026-11-21'
      }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(createdData.vendorId, 'vendor-123');
    assert.equal(createdData.expenseType, 'Fuel');
    assert.equal(createdData.name, 'Delivery van');
    assert.equal(createdData.amount, 125.5);
    assert.equal(createdData.expenseDate.toISOString(), '2026-11-21T06:30:00.000Z');
  } finally {
    Expense.create = originalCreate;
  }
});

test('rejects invalid expense amounts without writing a record', async () => {
  const originalCreate = Expense.create;
  Expense.create = async () => {
    throw new Error('Expense.create should not be called for invalid input');
  };

  try {
    const res = createResponse();
    await createExpense({
      user: { _id: 'vendor-123' },
      body: {
        expenseType: 'Fuel',
        name: 'Delivery van',
        amount: 0,
        expenseDate: '2026-11-21'
      }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /amount must be greater than zero/i);
  } finally {
    Expense.create = originalCreate;
  }
});
