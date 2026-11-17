const isAssignedAgentForOrder = (user, order) => Boolean(
  user?.role === 'agent' &&
  user._id &&
  user.vendorId &&
  order?.deliveryAgentId &&
  order.vendorId &&
  user._id.toString() === order.deliveryAgentId.toString() &&
  user.vendorId.toString() === order.vendorId.toString()
);

const canAgentUpdateOrder = (body) => Boolean(
  body &&
  body.status === 'delivered' &&
  Object.keys(body).every((key) =>
    ['status', 'products', 'bottlesReturned', 'cashCollected', 'deliveryNotes'].includes(key)) &&
  (body.products === undefined || (
    Array.isArray(body.products) &&
    body.products.every((item) =>
      item &&
      typeof item.productId === 'string' &&
      Number.isInteger(Number(item.deliveredQuantity)) &&
      Number(item.deliveredQuantity) >= 0)
  )) &&
  (body.bottlesReturned === undefined ||
    (Number.isInteger(Number(body.bottlesReturned)) && Number(body.bottlesReturned) >= 0)) &&
  (body.cashCollected === undefined ||
    (Number.isFinite(Number(body.cashCollected)) && Number(body.cashCollected) >= 0)) &&
  (body.deliveryNotes === undefined || typeof body.deliveryNotes === 'string')
);

module.exports = { isAssignedAgentForOrder, canAgentUpdateOrder };
