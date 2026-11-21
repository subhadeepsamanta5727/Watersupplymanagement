const express = require('express');
const router = express.Router();
const {
  createOrder,
  updateCustomerPendingOrder,
  cancelCustomerOrder,
  updateOrderStatus,
  recordPayment,
  getOrders,
  getPayments,
  exportPDFReport
} = require('../controllers/orderController');
const { protect, authorize, checkSubscription } = require('../middleware/auth');

router.use(protect);

// PDF Export (Vendor only)
router.get('/pdf-report', authorize('vendor'), exportPDFReport);

// Logging payments (Vendor only)
router.post('/payments', authorize('vendor'), checkSubscription, recordPayment);

// Vendors process their orders; agents may complete any delivery for their vendor.
router.put('/:id/status', authorize('vendor', 'agent'), checkSubscription, updateOrderStatus);

// Customers can edit or cancel their own pending orders.
router.put('/:id/cancel', authorize('customer'), cancelCustomerOrder);
router.put('/:id', authorize('customer'), updateCustomerPendingOrder);

// Orders List & Details (Vendor & Customer)
router.post('/', authorize('vendor', 'customer'), createOrder);
router.get('/', authorize('vendor', 'customer', 'agent'), getOrders);
router.get('/payments', authorize('vendor', 'customer'), getPayments);

module.exports = router;
