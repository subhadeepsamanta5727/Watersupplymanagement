const express = require('express');
const router = express.Router();
const {
  getSubscription,
  addProduct,
  getProducts,
  updateProduct,
  addCustomer,
  getCustomers,
  updateProfile,
  updateCustomerLedger,
  getVendorPlans,
  deleteProduct,
  getAgents,
  createAgent,
  assignDeliveryAgent,
  submitAgentCollection,
  submitAgentJars,
  updateCustomerCustomPrices,
  getProfitLossAnalytics,
  reportJarDamage,
  refundSecurityDeposit
} = require('../controllers/vendorController');
const { protect, authorize, checkSubscription } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor'));

router.get('/subscription', getSubscription);
router.post('/products', checkSubscription, addProduct);
router.get('/products', getProducts);
router.put('/products/:id', checkSubscription, updateProduct);
router.delete('/products/:id', checkSubscription, deleteProduct);
router.post('/customers', checkSubscription, addCustomer);
router.get('/customers', getCustomers);
router.put('/customers/:customerId', checkSubscription, updateCustomerLedger);
router.put('/customers/:customerId/custom-prices', checkSubscription, updateCustomerCustomPrices);
router.post('/customers/:customerId/damage', checkSubscription, reportJarDamage);
router.post('/customers/:customerId/refund-deposit', checkSubscription, refundSecurityDeposit);
router.get('/profit-loss', getProfitLossAnalytics);
router.put('/profile', updateProfile);
router.get('/agents', getAgents);
router.post('/agents', checkSubscription, createAgent);
router.post('/agents/:agentId/settlements', submitAgentCollection);
router.post('/agents/:agentId/jar-settlements', submitAgentJars);
router.put('/orders/:orderId/agent', checkSubscription, assignDeliveryAgent);

// Allow vendor to view subscription plans
router.get('/plans', getVendorPlans);

module.exports = router;

