const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getProfitLossDateRange,
  parseExpenseDate,
  calculateProfitLossSummary
} = require('../utils/profitLoss');

test('builds India-day and chosen-calendar-year date ranges', () => {
  const today = getProfitLossDateRange('today', undefined, new Date('2026-11-21T08:00:00.000Z'));
  assert.equal(today.start.toISOString(), '2026-11-20T18:30:00.000Z');
  assert.equal(today.end.toISOString(), '2026-11-21T18:30:00.000Z');

  const chosenYear = getProfitLossDateRange('chosenYear', 2024);
  assert.equal(chosenYear.start.toISOString(), '2023-12-31T18:30:00.000Z');
  assert.equal(chosenYear.end.toISOString(), '2024-12-31T18:30:00.000Z');
});

test('uses rolling week, month, and year ranges with an exclusive current-time end', () => {
  const now = new Date('2026-11-21T08:00:00.000Z');
  for (const [timeframe, days] of [['week', 7], ['month', 30], ['year', 365]]) {
    const range = getProfitLossDateRange(timeframe, undefined, now);
    assert.equal(range.start.getTime(), now.getTime() - days * 24 * 60 * 60 * 1000);
    assert.equal(range.end, now);
  }
});

test('validates expense dates and calculates gross and net profit separately', () => {
  assert.equal(parseExpenseDate('2026-11-21').toISOString(), '2026-11-21T06:30:00.000Z');
  assert.equal(parseExpenseDate('2026-02-30'), null);
  assert.equal(parseExpenseDate('21-11-2026'), null);

  assert.deepEqual(calculateProfitLossSummary({
    totalRevenue: 120,
    totalCOGS: 30,
    totalExpenses: 15,
    totalPurchasesExpense: 100,
    totalDeliveredOrders: 2,
    totalUnitsSold: 3
  }), {
    totalRevenue: 120,
    totalCOGS: 30,
    totalGrossProfit: 90,
    totalExpenses: 15,
    totalNetProfit: 75,
    totalPurchasesExpense: 100,
    totalDeliveredOrders: 2,
    totalUnitsSold: 3,
    profitMargin: 75,
    netProfitMargin: 62.5
  });
});
