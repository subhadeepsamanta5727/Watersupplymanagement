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

const validateAgentPaymentCollection = (paymentMethod, amount, deliveryCharge, dueBalance) => {
  if (!['cash', 'online', 'due'].includes(paymentMethod)) {
    const error = new Error('Payment method must be cash, online, or due');
    error.statusCode = 400;
    throw error;
  }

  const collected = validateAgentCashCollection(amount, deliveryCharge, dueBalance);
  if (paymentMethod === 'due' && collected > 0) {
    const error = new Error('Collected amount must be zero when the payment method is due');
    error.statusCode = 400;
    throw error;
  }
  return collected;
};

module.exports = { validateAgentCashCollection, validateAgentPaymentCollection };
