const express = require('express');
const router = express.Router();
const { createPurchase, getPurchases } = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor'));

router.route('/')
  .post(createPurchase)
  .get(getPurchases);

module.exports = router;
