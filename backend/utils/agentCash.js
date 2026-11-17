const validateAgentCashCollection = (amount, deliveryCharge, dueBalance) => {
  const cash = Number(amount ?? 0);
  const charge = Number(deliveryCharge);
  const due = Number(dueBalance);

  if (!Number.isFinite(cash) || cash < 0 ||
      !Number.isFinite(charge) || charge < 0 ||
      !Number.isFinite(due)) {
    const error = new Error('Cash collection values are invalid');
    error.statusCode = 400;
    throw error;
  }
  if (cash > charge || cash > Math.max(0, due)) {
    const error = new Error('Cash collected cannot exceed this delivery charge or the customer amount due');
    error.statusCode = 400;
    throw error;
  }
  return cash;
};

module.exports = { validateAgentCashCollection };
