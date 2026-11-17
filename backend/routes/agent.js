const express = require('express');
const router = express.Router();
const { getDashboard, claimOrder, releaseOrder } = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('agent'));
router.get('/dashboard', getDashboard);
router.put('/orders/:orderId/claim', claimOrder);
router.put('/orders/:orderId/release', releaseOrder);

module.exports = router;
