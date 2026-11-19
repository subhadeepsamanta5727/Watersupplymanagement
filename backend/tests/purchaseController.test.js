const test = require('node:test');
const assert = require('node:assert/strict');

test('purchase validation: calculates total cost and validates quantity', () => {
  // Test purchase calculation logic
  const calculateTotal = (unitCost, qty, explicitTotal) => {
    const calculatedUnitCost = Number(unitCost) >= 0 ? Number(unitCost) : 0;
    return Number(explicitTotal) > 0 ? Number(explicitTotal) : calculatedUnitCost * qty;
  };

  assert.equal(calculateTotal(40, 50, 0), 2000);
  assert.equal(calculateTotal(40, 50, 1900), 1900);
  assert.equal(calculateTotal(0, 50, 0), 0);

  // Validate positive integer quantity
  const isValidQty = (q) => Number.isInteger(Number(q)) && Number(q) > 0;
  assert.equal(isValidQty(50), true);
  assert.equal(isValidQty('25'), true);
  assert.equal(isValidQty(0), false);
  assert.equal(isValidQty(-5), false);
  assert.equal(isValidQty(2.5), false);
});
