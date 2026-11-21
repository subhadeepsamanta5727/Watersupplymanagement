const getRequestedQuantity = (item) => item.requestedQuantity ?? item.quantity;

const getPendingOrderQuantityDeltas = (currentProducts, updatedProducts) => {
  const currentQuantities = new Map(currentProducts.map((item) => [
    item.productId.toString(),
    getRequestedQuantity(item)
  ]));
  const updatedQuantities = new Map(updatedProducts.map((item) => [
    item.productId.toString(),
    Number(item.quantity)
  ]));
  const productIds = new Set([...currentQuantities.keys(), ...updatedQuantities.keys()]);

  return [...productIds]
    .map((productId) => ({
      productId,
      delta: (updatedQuantities.get(productId) || 0) - (currentQuantities.get(productId) || 0)
    }))
    .filter((item) => item.delta !== 0);
};

const allocateDeliveredQuantities = (orderProducts, targetDeliveredTotal) => {
  if (orderProducts.some((item) => item.deliveredQuantity !== undefined)) {
    return orderProducts.map((item) => Number(item.deliveredQuantity ?? 0));
  }

  let remaining = targetDeliveredTotal;
  return orderProducts.map((item) => {
    const delivered = Math.min(getRequestedQuantity(item), remaining);
    remaining -= delivered;
    return delivered;
  });
};

const validateDeliveredQuantities = (orderProducts, deliveredQuantities, declaredTotal) => {
  if (deliveredQuantities.some((quantity, index) =>
    !Number.isInteger(quantity) || quantity < 0 ||
    quantity > getRequestedQuantity(orderProducts[index]))) {
    const error = new Error('Delivered quantities must be whole numbers within the requested quantities');
    error.statusCode = 400;
    throw error;
  }

  const totalDelivered = deliveredQuantities.reduce((sum, quantity) => sum + quantity, 0);
  if (declaredTotal !== undefined && totalDelivered !== Number(declaredTotal)) {
    const error = new Error('Delivered quantity total does not match the item quantities');
    error.statusCode = 400;
    throw error;
  }
  return totalDelivered;
};

const validateReturnedJarCount = (returnedCount, outstandingCount, deliveredCount) => {
  const returned = Number(returnedCount ?? 0);
  const outstanding = Number(outstandingCount);
  const delivered = Number(deliveredCount);
  if (!Number.isInteger(outstanding) || outstanding < 0 ||
      !Number.isInteger(delivered) || delivered < 0) {
    const error = new Error('Customer jar balance is invalid');
    error.statusCode = 409;
    throw error;
  }
  if (!Number.isInteger(returned) || returned < 0 || returned > outstanding + delivered) {
    const error = new Error('Returned jars must be a whole number between zero and the available outstanding jars');
    error.statusCode = 400;
    throw error;
  }
  return returned;
};

module.exports = {
  allocateDeliveredQuantities,
  getRequestedQuantity,
  getPendingOrderQuantityDeltas,
  validateDeliveredQuantities,
  validateReturnedJarCount
};
