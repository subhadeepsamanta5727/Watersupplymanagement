const test = require('node:test');
const assert = require('node:assert/strict');

test('custom pricing: resolves customer custom price when set, falls back to standard price', () => {
  const standardProduct = {
    _id: 'prod_123',
    name: '20L Jar',
    price: 50,
    purchasePrice: 30
  };

  const resolveItemPricing = (dbProduct, relationCustomPrices) => {
    const customPriceObj = (relationCustomPrices || []).find(
      (cp) => cp.productId && cp.productId.toString() === dbProduct._id.toString()
    );
    const unitSellPrice = (customPriceObj && customPriceObj.price !== undefined && customPriceObj.price !== null)
      ? Number(customPriceObj.price)
      : Number(dbProduct.price);
    const unitCostPrice = dbProduct.purchasePrice !== undefined ? Number(dbProduct.purchasePrice) : 0;

    return {
      price: unitSellPrice,
      purchasePrice: unitCostPrice
    };
  };

  // Customer XYZ has a negotiated special price of 45
  const xyzCustomPrices = [{ productId: 'prod_123', price: 45 }];
  const xyzPricing = resolveItemPricing(standardProduct, xyzCustomPrices);
  assert.equal(xyzPricing.price, 45);
  assert.equal(xyzPricing.purchasePrice, 30);

  // Customer ABC has a negotiated special price of 40
  const abcCustomPrices = [{ productId: 'prod_123', price: 40 }];
  const abcPricing = resolveItemPricing(standardProduct, abcCustomPrices);
  assert.equal(abcPricing.price, 40);
  assert.equal(abcPricing.purchasePrice, 30);

  // Customer DEF has no special price set -> falls back to standard 50
  const defPricing = resolveItemPricing(standardProduct, []);
  assert.equal(defPricing.price, 50);
  assert.equal(defPricing.purchasePrice, 30);
});

test('profit and loss: calculates revenue, COGS, gross profit, and margin accurately', () => {
  const calculateProfitLoss = (deliveredOrders, defaultProductCosts = {}) => {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalUnitsSold = 0;

    const productMap = new Map();
    const customerMap = new Map();

    for (const order of deliveredOrders) {
      let orderRevenue = 0;
      let orderCOGS = 0;
      let orderUnits = 0;

      const custId = order.customerId || 'unknown';
      const custName = order.customerName || 'Customer';

      for (const item of (order.products || [])) {
        const qty = item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : Number(item.quantity || 0);
        if (qty <= 0) continue;

        const sellPrice = Number(item.price || 0);
        const costPrice = (item.purchasePrice !== undefined && item.purchasePrice !== null && item.purchasePrice > 0)
          ? Number(item.purchasePrice)
          : (defaultProductCosts[item.productId] || 0);

        const rev = qty * sellPrice;
        const cogs = qty * costPrice;

        orderRevenue += rev;
        orderCOGS += cogs;
        orderUnits += qty;

        const pKey = item.productId || item.name;
        if (!productMap.has(pKey)) {
          productMap.set(pKey, { name: item.name, unitsSold: 0, revenue: 0, cogs: 0, profit: 0 });
        }
        const pStat = productMap.get(pKey);
        pStat.unitsSold += qty;
        pStat.revenue += rev;
        pStat.cogs += cogs;
        pStat.profit += (rev - cogs);
      }

      totalRevenue += orderRevenue;
      totalCOGS += orderCOGS;
      totalUnitsSold += orderUnits;

      if (!customerMap.has(custId)) {
        customerMap.set(custId, { name: custName, unitsSold: 0, revenue: 0, cogs: 0, profit: 0 });
      }
      const cStat = customerMap.get(custId);
      cStat.unitsSold += orderUnits;
      cStat.revenue += orderRevenue;
      cStat.cogs += orderCOGS;
      cStat.profit += (orderRevenue - orderCOGS);
    }

    const totalGrossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      profitMargin,
      totalUnitsSold,
      productBreakdown: Array.from(productMap.values()),
      customerBreakdown: Array.from(customerMap.values())
    };
  };

  // Scenario:
  // Order 1: Customer XYZ orders 2 pcs at custom price 45 (purchasePrice 30)
  // Revenue: 90, COGS: 60, Profit: 30
  // Order 2: Customer ABC orders 1 pc at custom price 40 (purchasePrice 30)
  // Revenue: 40, COGS: 30, Profit: 10
  // Order 3: Customer DEF orders 2 pcs at standard price 50 (purchasePrice 30)
  // Revenue: 100, COGS: 60, Profit: 40
  const orders = [
    {
      customerId: 'cust_xyz',
      customerName: 'XYZ Enterprise',
      products: [{ productId: 'prod_1', name: '20L Jar', quantity: 2, deliveredQuantity: 2, price: 45, purchasePrice: 30 }]
    },
    {
      customerId: 'cust_abc',
      customerName: 'ABC Cafe',
      products: [{ productId: 'prod_1', name: '20L Jar', quantity: 1, deliveredQuantity: 1, price: 40, purchasePrice: 30 }]
    },
    {
      customerId: 'cust_def',
      customerName: 'DEF Society',
      products: [{ productId: 'prod_1', name: '20L Jar', quantity: 2, deliveredQuantity: 2, price: 50, purchasePrice: 30 }]
    }
  ];

  const result = calculateProfitLoss(orders);

  assert.equal(result.totalRevenue, 230); // 90 + 40 + 100
  assert.equal(result.totalCOGS, 150);    // 60 + 30 + 60
  assert.equal(result.totalGrossProfit, 80); // 230 - 150
  assert.equal(result.profitMargin, 34.8);   // (80 / 230) * 100 = 34.78% -> 34.8%
  assert.equal(result.totalUnitsSold, 5);

  // Check product breakdown
  const p1 = result.productBreakdown[0];
  assert.equal(p1.unitsSold, 5);
  assert.equal(p1.revenue, 230);
  assert.equal(p1.cogs, 150);
  assert.equal(p1.profit, 80);

  // Check customer breakdown
  const xyz = result.customerBreakdown.find((c) => c.name === 'XYZ Enterprise');
  assert.equal(xyz.unitsSold, 2);
  assert.equal(xyz.revenue, 90);
  assert.equal(xyz.profit, 30);

  const abc = result.customerBreakdown.find((c) => c.name === 'ABC Cafe');
  assert.equal(abc.unitsSold, 1);
  assert.equal(abc.revenue, 40);
  assert.equal(abc.profit, 10);

  const def = result.customerBreakdown.find((c) => c.name === 'DEF Society');
  assert.equal(def.unitsSold, 2);
  assert.equal(def.revenue, 100);
  assert.equal(def.profit, 40);
});

test('product custom price: updates or sets custom price for specific product and removes cleanly', () => {
  let customPrices = [
    { productId: 'prod_999', price: 25 }
  ];

  // Set price for prod_123 to 45
  const productId = 'prod_123';
  const newPrice = 45;
  customPrices = customPrices.filter((cp) => cp.productId !== productId);
  customPrices.push({ productId, price: newPrice });

  assert.equal(customPrices.length, 2);
  const item = customPrices.find((cp) => cp.productId === productId);
  assert.equal(item.price, 45);

  // Remove price for prod_123
  customPrices = customPrices.filter((cp) => cp.productId !== productId);
  assert.equal(customPrices.length, 1);
  assert.equal(customPrices[0].productId, 'prod_999');
});
