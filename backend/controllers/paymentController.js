const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const RazorpayConfig = require('../models/RazorpayConfig');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const VendorCustomer = require('../models/VendorCustomer');

// @desc    Get Razorpay config details (keys)
// @route   GET /api/v1/payment/config
// @access  Private (Admin only)
exports.getPaymentConfig = async (req, res) => {
  try {
    const config = await RazorpayConfig.findOne().select('+keySecret');
    if (!config) {
      return res.status(200).json({
        success: true,
        data: {
          keyId: '',
          hasSecret: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        keyId: config.keyId,
        hasSecret: !!config.keySecret
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save/Update Razorpay config details (keys)
// @route   POST /api/v1/payment/config
// @access  Private (Admin only)
exports.savePaymentConfig = async (req, res) => {
  try {
    const { keyId, keySecret } = req.body;

    if (!keyId || !keySecret) {
      return res.status(400).json({ success: false, message: 'Please provide both Key ID and Key Secret' });
    }

    let config = await RazorpayConfig.findOne().select('+keySecret');
    if (config) {
      config.keyId = keyId;
      config.keySecret = keySecret;
      config.updatedAt = Date.now();
      await config.save();
    } else {
      config = await RazorpayConfig.create({
        keyId,
        keySecret
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment settings saved successfully',
      data: {
        keyId: config.keyId,
        hasSecret: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/v1/payment/create-order
// @access  Private (Vendor only)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Please provide planId' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found or inactive' });
    }

    // Secure against manual subscription to free plan
    if (plan.price === 0 || (plan.name && plan.name.toLowerCase().includes('free'))) {
      return res.status(400).json({ success: false, message: 'Free Trial plans cannot be manually purchased.' });
    }


    const config = await RazorpayConfig.findOne().select('+keySecret');
    if (!config || !config.keyId || !config.keySecret) {
      return res.status(400).json({ success: false, message: 'Payment gateway not configured by Administrator yet' });
    }

    const rzp = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret
    });

    const options = {
      amount: plan.price * 100, // amount in paisa
      currency: 'INR',
      receipt: `rcpt_plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await rzp.orders.create(options);
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (plan.duration === 'monthly') {
      endDate.setDate(startDate.getDate() + 30);
    } else if (plan.duration === 'quarterly') {
      endDate.setDate(startDate.getDate() + 90);
    } else if (plan.duration === 'yearly') {
      endDate.setDate(startDate.getDate() + 365);
    }

    await VendorSubscription.create({
      vendorId: req.user._id,
      planId,
      startDate,
      endDate,
      isActive: false,
      purchaseAmount: plan.price,
      paymentStatus: 'pending',
      razorpayOrderId: order.id
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.keyId // return keyId for frontend overlay
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Razorpay Payment and Assign Subscription
// @route   POST /api/v1/payment/verify
// @access  Private (Vendor only)
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!planId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const vendorId = req.user._id;
    const pendingSubscription = await VendorSubscription.findOne({
      vendorId,
      planId,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: 'pending'
    });
    if (!pendingSubscription) {
      return res.status(404).json({ success: false, message: 'Subscription payment order not found or already processed' });
    }

    const config = await RazorpayConfig.findOne().select('+keySecret');
    if (!config || !config.keySecret) {
      return res.status(400).json({ success: false, message: 'Payment config error' });
    }

    // Cryptographic signature check
    const hmac = crypto.createHmac('sha256', config.keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    const expectedSignature = Buffer.from(generated_signature, 'hex');
    const receivedSignature = Buffer.from(razorpay_signature, 'hex');
    if (expectedSignature.length !== receivedSignature.length ||
        !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
      return res.status(400).json({ success: false, message: 'Cryptographic signature verification failed' });
    }

    const rzp = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
    const [gatewayOrder, gatewayPayment] = await Promise.all([
      rzp.orders.fetch(razorpay_order_id),
      rzp.payments.fetch(razorpay_payment_id)
    ]);
    if (gatewayPayment.status !== 'captured' ||
        gatewayPayment.order_id !== razorpay_order_id ||
        gatewayPayment.amount !== gatewayOrder.amount ||
        gatewayPayment.currency !== 'INR' ||
        gatewayOrder.amount !== Math.round(pendingSubscription.purchaseAmount * 100) ||
        gatewayOrder.currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Payment amount or status does not match the selected plan' });
    }

    if (await VendorSubscription.exists({ razorpayPaymentId: razorpay_payment_id })) {
      return res.status(409).json({ success: false, message: 'This payment has already been used' });
    }

    // Assign the new subscription to the vendor
    const startDate = new Date();
    const endDate = new Date();

    if (plan.duration === 'monthly') {
      endDate.setDate(startDate.getDate() + 30);
    } else if (plan.duration === 'quarterly') {
      endDate.setDate(startDate.getDate() + 90);
    } else if (plan.duration === 'yearly') {
      endDate.setDate(startDate.getDate() + 365);
    }

    const session = await mongoose.startSession();
    let sub;
    try {
      await session.withTransaction(async () => {
        await VendorSubscription.updateMany(
          { vendorId, isActive: true },
          { isActive: false },
          { session }
        );

        sub = await VendorSubscription.findOneAndUpdate(
          {
            _id: pendingSubscription._id,
            paymentStatus: 'pending'
          },
          {
            $set: {
              startDate,
              endDate,
              isActive: true,
              pricePaid: gatewayPayment.amount / 100,
              paymentStatus: 'captured',
              razorpayPaymentId: razorpay_payment_id
            }
          },
          { new: true, runValidators: true, session }
        );
        if (!sub) {
          const error = new Error('Subscription payment has already been processed');
          error.statusCode = 409;
          throw error;
        }
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully!',
      data: sub
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This payment has already been used' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay Order from Customer to Vendor
// @route   POST /api/v1/payment/customer/create-order
// @access  Private (Customer only)
exports.createCustomerOrder = async (req, res) => {
  try {
    const { vendorId, amount } = req.body;

    const numericAmount = Number(amount);
    if (!vendorId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide vendorId and a valid amount greater than 0' });
    }

    // Find vendor and retrieve their Razorpay credentials
    const vendor = await User.findById(vendorId).select('+razorpayKeySecret');
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!vendor.razorpayKeyId || !vendor.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'This vendor does not support online payments at this moment.' });
    }

    // Verify customer is connected to vendor
    const relation = await VendorCustomer.findOne({ vendorId, customerId: req.user._id });
    if (!relation) {
      return res.status(400).json({ success: false, message: 'You are not linked to this vendor' });
    }

    const rzp = new Razorpay({
      key_id: vendor.razorpayKeyId,
      key_secret: vendor.razorpayKeySecret
    });

    const options = {
      amount: Math.round(numericAmount * 100), // amount in paisa
      currency: 'INR',
      receipt: `rcpt_cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await rzp.orders.create(options);
    await Payment.create({
      vendorId,
      customerId: req.user._id,
      amount: order.amount / 100,
      paymentMethod: 'online',
      status: 'pending',
      razorpayOrderId: order.id
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: vendor.razorpayKeyId // return vendor's keyId for frontend overlay
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Customer payment and log collection
// @route   POST /api/v1/payment/customer/verify
// @access  Private (Customer only)
exports.verifyCustomerPayment = async (req, res) => {
  try {
    const { vendorId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!vendorId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    // Find vendor keys
    const vendor = await User.findById(vendorId).select('+razorpayKeySecret');
    if (!vendor || !vendor.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Vendor payment config error' });
    }

    const pendingPayment = await Payment.findOne({
      vendorId,
      customerId: req.user._id,
      razorpayOrderId: razorpay_order_id,
      status: 'pending'
    });
    if (!pendingPayment) {
      return res.status(404).json({ success: false, message: 'Payment order not found or already processed' });
    }

    // Cryptographic signature check
    const hmac = crypto.createHmac('sha256', vendor.razorpayKeySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    const expectedSignature = Buffer.from(generated_signature, 'hex');
    const receivedSignature = Buffer.from(razorpay_signature, 'hex');
    if (expectedSignature.length !== receivedSignature.length ||
        !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
      return res.status(400).json({ success: false, message: 'Signature verification failed' });
    }

    const rzp = new Razorpay({
      key_id: vendor.razorpayKeyId,
      key_secret: vendor.razorpayKeySecret
    });
    const [gatewayOrder, gatewayPayment] = await Promise.all([
      rzp.orders.fetch(razorpay_order_id),
      rzp.payments.fetch(razorpay_payment_id)
    ]);
    if (gatewayPayment.status !== 'captured' ||
        gatewayPayment.order_id !== razorpay_order_id ||
        gatewayPayment.amount !== gatewayOrder.amount ||
        gatewayPayment.amount !== Math.round(pendingPayment.amount * 100) ||
        gatewayPayment.currency !== 'INR' ||
        gatewayOrder.currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Payment amount or status could not be verified' });
    }

    const session = await mongoose.startSession();
    let payment;
    try {
      await session.withTransaction(async () => {
        payment = await Payment.findOne({
          _id: pendingPayment._id,
          status: 'pending'
        }).session(session);
        if (!payment) {
          const error = new Error('Payment order has already been processed');
          error.statusCode = 409;
          throw error;
        }

        const relation = await VendorCustomer.findOne({
          vendorId,
          customerId: req.user._id
        }).session(session);
        if (!relation) {
          const error = new Error('Customer is no longer linked to this vendor');
          error.statusCode = 400;
          throw error;
        }

        payment.razorpayPaymentId = razorpay_payment_id;
        payment.status = 'captured';
        payment.notes = `Razorpay Payment ID: ${razorpay_payment_id}`;
        payment.paymentDate = new Date();
        await payment.save({ session });

        relation.balance -= payment.amount;
        await relation.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and outstanding balance updated!',
      data: payment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This payment has already been processed' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

