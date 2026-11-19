const test = require('node:test');
const assert = require('node:assert/strict');

test('returnable jars: non-returnable products do not affect bottlesOutstanding', () => {
  const orderProducts = [
    { productId: 'p1', name: '20L Jar', quantity: 2, isReturnable: true },
    { productId: 'p2', name: '1L Bottle Pack', quantity: 10, isReturnable: false }
  ];

  // Returnable items delivered calculation
  const returnableDelivered = orderProducts
    .filter((item) => item.isReturnable !== false)
    .reduce((sum, item) => sum + item.quantity, 0);

  assert.equal(returnableDelivered, 2); // Only the 20L jars count towards returnable bottles!

  const oldOutstanding = 1;
  const returnedJars = 1;
  const newOutstanding = oldOutstanding + (returnableDelivered - returnedJars);
  assert.equal(newOutstanding, 2); // 1 + (2 - 1) = 2
});

test('security deposit: charged on first returnable jar order only', () => {
  const calculateDeposit = (products, hasOrderedReturnable) => {
    let deposit = 0;
    if (!hasOrderedReturnable) {
      for (const p of products) {
        if (p.isReturnable !== false && p.securityDeposit > 0) {
          deposit += p.securityDeposit * p.quantity;
        }
      }
    }
    return deposit;
  };

  const cart = [
    { productId: 'p1', name: '20L Jar', quantity: 2, price: 50, isReturnable: true, securityDeposit: 150 },
    { productId: 'p2', name: '500ml Pack', quantity: 1, price: 120, isReturnable: false, securityDeposit: 0 }
  ];

  // First order: customer has never ordered returnable jars before
  const firstOrderDeposit = calculateDeposit(cart, false);
  assert.equal(firstOrderDeposit, 300); // 2 * 150

  const firstOrderWaterTotal = (2 * 50) + (1 * 120); // 220
  const firstOrderTotal = firstOrderWaterTotal + firstOrderDeposit;
  assert.equal(firstOrderTotal, 520); // 220 + 300

  // Second order: customer has already ordered returnable jars
  const secondOrderDeposit = calculateDeposit(cart, true);
  assert.equal(secondOrderDeposit, 0); // No deposit charged again!
  const secondOrderTotal = firstOrderWaterTotal + secondOrderDeposit;
  assert.equal(secondOrderTotal, 220);
});

test('damaged jar write-off: decreases bottlesOutstanding and applies vendor penalty', () => {
  const processDamage = (relation, jarCount, penaltyAmount, deductFromDeposit = false) => {
    if (jarCount > relation.bottlesOutstanding) {
      throw new Error('Cannot write off more jars than outstanding');
    }

    const updated = { ...relation };
    updated.bottlesOutstanding -= jarCount;

    if (deductFromDeposit && updated.securityDeposit >= penaltyAmount) {
      updated.securityDeposit -= penaltyAmount;
    } else {
      updated.balance += penaltyAmount;
    }

    return updated;
  };

  const initialRelation = {
    bottlesOutstanding: 3,
    balance: 100, // owes 100
    securityDeposit: 300
  };

  // Case 1: Vendor reports 1 damaged jar with 150 penalty added to balance
  const res1 = processDamage(initialRelation, 1, 150, false);
  assert.equal(res1.bottlesOutstanding, 2); // 3 - 1
  assert.equal(res1.balance, 250);          // 100 + 150
  assert.equal(res1.securityDeposit, 300);

  // Case 2: Vendor reports 1 damaged jar and chooses to deduct from security deposit
  const res2 = processDamage(initialRelation, 1, 150, true);
  assert.equal(res2.bottlesOutstanding, 2); // 3 - 1
  assert.equal(res2.balance, 100);          // unchanged
  assert.equal(res2.securityDeposit, 150);  // 300 - 150
});
