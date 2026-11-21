const { getIndiaDayBounds } = require('./indiaDate');

const getIndiaYearBounds = (year) => ({
  start: new Date(`${year}-01-01T00:00:00+05:30`),
  end: new Date(`${year + 1}-01-01T00:00:00+05:30`)
});

const getProfitLossDateRange = (timeframe, year, now = new Date()) => {
  if (timeframe === 'all') return null;
  if (timeframe === 'today') return getIndiaDayBounds(now);
  if (timeframe === 'chosenYear') return getIndiaYearBounds(year);

  const daysByTimeframe = { week: 7, month: 30, year: 365 };
  const days = daysByTimeframe[timeframe];
  if (!days) throw new RangeError('Unsupported profit and loss timeframe');

  return {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: now
  };
};

const parseExpenseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const utcDate = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== value) return null;
  return new Date(`${value}T12:00:00+05:30`);
};

const calculateProfitLossSummary = ({
  totalRevenue,
  totalCOGS,
  totalExpenses,
  totalPurchasesExpense,
  totalDeliveredOrders,
  totalUnitsSold
}) => {
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  return {
    totalRevenue,
    totalCOGS,
    totalGrossProfit: grossProfit,
    totalExpenses,
    totalNetProfit: netProfit,
    totalPurchasesExpense,
    totalDeliveredOrders,
    totalUnitsSold,
    profitMargin: totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
    netProfitMargin: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0
  };
};

module.exports = {
  getIndiaYearBounds,
  getProfitLossDateRange,
  parseExpenseDate,
  calculateProfitLossSummary
};
