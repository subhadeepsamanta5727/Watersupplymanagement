const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const AgentSettlement = require('../models/AgentSettlement');
const AgentJarSettlement = require('../models/AgentJarSettlement');
const Product = require('../models/Product');
const VendorCustomer = require('../models/VendorCustomer');
const VendorSubscription = require('../models/VendorSubscription');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const JarActivity = require('../models/JarActivity');
const { parsePagination } = require('../utils/pagination');
const {
  getProfitLossDateRange,
  calculateProfitLossSummary
} = require('../utils/profitLoss');

// Helper function to check subscription status and limit
const checkSubscriptionStatus = async (vendorId) => {
  const activeSub = await VendorSubscription.findOne({
    vendorId,
    isActive: true,
    endDate: { $gte: new Date() }
  }).populate('planId');

  if (!activeSub) {
    return { active: false, error: 'No active subscription found. Please purchase a plan or contact Admin.' };
  }

  const customerCount = await VendorCustomer.countDocuments({ vendorId });
  const userLimit = activeSub.planId?.userLimit || 0;

  return {
    active: true,
    userLimit,
    customerCount,
    isLimitExceeded: customerCount >= userLimit,
    subscription: activeSub
  };
};

// @desc    Get Vendor Subscription details
// @route   GET /api/v1/vendor/subscription
// @access  Private (Vendor only)
exports.getSubscription = async (req, res) => {
  try {
    const status = await checkSubscriptionStatus(req.user._id);
    res.status(200).json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a Product
// @route   POST /api/v1/vendor/products
// @access  Private (Vendor only)
exports.addProduct = async (req, res) => {
  try {
    const { name, price, purchasePrice, isReturnable, securityDeposit, description, imageUrl, quantity, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name and price' });
    }
    const initialStock = stock !== undefined ? Number(stock) : 0;
    if (!Number.isFinite(initialStock) || initialStock < 0) {
      return res.status(400).json({ success: false, message: 'Initial stock must be a non-negative number.' });
    }

    // Check if subscription active
    const subStatus = await checkSubscriptionStatus(req.user._id);
    if (!subStatus.active) {
      return res.status(403).json({ success: false, message: subStatus.error });
    }

    const product = await Product.create({
      vendorId: req.user._id,
      name,
      price: Number(price),
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : 0,
      isReturnable: isReturnable !== undefined ? Boolean(isReturnable) : true,
      securityDeposit: securityDeposit !== undefined ? Math.max(0, Number(securityDeposit)) : 0,
      description,
      quantity: quantity || '',
      stock: initialStock,
      isActive: initialStock > 0,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1548839130-3fd96cd5bd4d?q=80&w=256' // standard nice water bottle image
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Vendor Products
// @route   GET /api/v1/vendor/products
// @access  Private (Vendor/Customer)
exports.getProducts = async (req, res) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user._id : req.query.vendorId;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Please specify vendor ID' });
    }

    const filter = { vendorId };
    if (req.user.role !== 'vendor') {
      filter.isActive = true;
    }

    const products = await Product.find(filter);
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a Product
// @route   PUT /api/v1/vendor/products/:id
// @access  Private (Vendor only)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, description, imageUrl, isActive, quantity, stock, stockAddition } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure vendor owns the product
    if (product.vendorId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (stock !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Stock cannot be replaced. Use stockAddition to increase stock.'
      });
    }
    if (isActive !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Availability status is determined automatically from stock.'
      });
    }

    const updateData = {};
    for (const field of ['name', 'price', 'purchasePrice', 'isReturnable', 'securityDeposit', 'description', 'imageUrl', 'quantity']) {
      if (req.body[field] !== undefined) {
        if (field === 'price' || field === 'purchasePrice' || field === 'securityDeposit') {
          updateData[field] = Math.max(0, Number(req.body[field]));
        } else if (field === 'isReturnable') {
          updateData[field] = Boolean(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    const updateOperation = {};
    if (Object.keys(updateData).length > 0) updateOperation.$set = updateData;
    if (stockAddition !== undefined) {
      const addition = Number(stockAddition);
      if (!Number.isFinite(addition) || addition <= 0) {
        return res.status(400).json({ success: false, message: 'Stock addition must be a positive number.' });
      }
      updateOperation.$inc = { stock: addition };
      updateOperation.$set = { ...updateData, isActive: true };
    }
    if (Object.keys(updateOperation).length === 0) {
      return res.status(400).json({ success: false, message: 'No product updates provided.' });
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateOperation, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Product
// @route   DELETE /api/v1/vendor/products/:id
// @access  Private (Vendor only)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure vendor owns the product
    if (product.vendorId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    await Product.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add (Connect) a customer by phone number
// @route   POST /api/v1/vendor/customers
// @access  Private (Vendor only)
exports.addCustomer = async (req, res) => {
  try {
    const { phone, name, address } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide customer phone number' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Customer phone number must be exactly 10 digits' });
    }

    // 1. Verify active subscription and user limit
    const subStatus = await checkSubscriptionStatus(req.user._id);
    if (!subStatus.active) {
      return res.status(403).json({ success: false, message: subStatus.error });
    }
    if (subStatus.isLimitExceeded) {
      return res.status(403).json({
        success: false,
        message: `Your active plan limit of ${subStatus.userLimit} customers is reached. Please upgrade.`
      });
    }

    // 2. Find or create the Customer
    let customer = await User.findOne({ phone });

    if (customer) {
      if (customer.role !== 'customer') {
        return res.status(400).json({ success: false, message: 'Cannot add a user who is not a customer' });
      }
    } else {
      // Create new customer account automatically
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Phone number does not exist. Please provide customer name to register.'
        });
      }
      customer = await User.create({
        name,
        phone,
        address: address || '',
        addresses: address ? [address] : [],
        role: 'customer'
      });
    }

    // 3. Connect Vendor & Customer
    let relation = await VendorCustomer.findOne({
      vendorId: req.user._id,
      customerId: customer._id
    });

    if (relation) {
      return res.status(400).json({ success: false, message: 'Customer is already connected to you' });
    }

    relation = await VendorCustomer.create({
      vendorId: req.user._id,
      customerId: customer._id
    });

    res.status(201).json({
      success: true,
      message: 'Customer successfully added and linked',
      data: {
        relationId: relation._id,
        customer: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address
        },
        bottlesOutstanding: relation.bottlesOutstanding,
        balance: relation.balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all connected customers
// @route   GET /api/v1/vendor/customers
// @access  Private (Vendor only)
exports.getCustomers = async (req, res) => {
  try {
    const query = { vendorId: req.user._id };
    const pagination = parsePagination(req.query);
    let relationQuery = VendorCustomer.find(query)
      .populate('customerId')
      .sort({ createdAt: -1, _id: -1 });
    let pageInfo;
    if (pagination) {
      const total = await VendorCustomer.countDocuments(query);
      relationQuery = relationQuery.skip((pagination.page - 1) * pagination.limit).limit(pagination.limit);
      pageInfo = {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      };
    }
    const relations = await relationQuery;

    const customerList = relations.map((rel) => {
      const cust = rel.customerId;
      return {
        relationId: rel._id,
        customerId: cust?._id,
        name: cust?.name || 'Deleted User',
        phone: cust?.phone || 'N/A',
        address: cust?.address || 'N/A',
        bottlesOutstanding: rel.bottlesOutstanding,
        balance: rel.balance,
        securityDeposit: rel.securityDeposit || 0,
        hasOrderedReturnable: !!rel.hasOrderedReturnable,
        customPrices: rel.customPrices || [],
        createdAt: rel.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: pageInfo ? pageInfo.total : customerList.length,
      ...(pageInfo ? { pagination: pageInfo } : {}),
      data: customerList
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Vendor Profile & Settings
// @route   PUT /api/v1/vendor/profile
// @access  Private (Vendor only)
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email, address, upiId, razorpayKeyId, razorpayKeySecret, password, deliverySlots } = req.body;
    const user = await User.findById(req.user._id).select('+razorpayKeySecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check if phone is being updated and is already taken
    if (phone && phone !== user.phone) {
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
      }
      const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number is already in use by another user' });
      }
      user.phone = phone;
    }

    // Check if email is being updated and is already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another user' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (upiId !== undefined) {
      if (typeof upiId !== 'string' || (upiId.trim() && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim()))) {
        return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID' });
      }
      user.upiId = upiId.trim();
    }
    if (razorpayKeyId !== undefined) user.razorpayKeyId = razorpayKeyId;
    if (razorpayKeySecret) user.razorpayKeySecret = razorpayKeySecret;
    if (deliverySlots !== undefined) user.deliverySlots = deliverySlots;

    if (password) {
      user.password = password; // pre-save hook will hash this automatically
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile settings updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        upiId: user.upiId,
        razorpayKeyId: user.razorpayKeyId,
        hasRazorpaySecret: Boolean(user.razorpayKeySecret),
        deliverySlots: user.deliverySlots,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer ledger (balance & outstanding bottles) manually
// @route   PUT /api/v1/vendor/customers/:customerId
// @access  Private (Vendor only)
exports.updateCustomerLedger = async (req, res) => {
  try {
    const { balance, bottlesOutstanding } = req.body;
    const { customerId } = req.params;
    const vendorId = req.user._id;

    // Find the relationship
    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    if (balance !== undefined) {
      relation.balance = Number(balance);
    }
    if (bottlesOutstanding !== undefined) {
      relation.bottlesOutstanding = Number(bottlesOutstanding);
    }

    await relation.save();

    res.status(200).json({
      success: true,
      message: 'Customer ledger updated successfully',
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        balance: relation.balance,
        bottlesOutstanding: relation.bottlesOutstanding
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Subscription Plans for Vendors (Excludes free plans)
// @route   GET /api/v1/vendor/plans
// @access  Private (Vendor only)
exports.getVendorPlans = async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plans = await SubscriptionPlan.find({ isActive: true });
    // Filter out free plans and plans with price = 0
    const paidPlans = plans.filter(
      (plan) => plan.price > 0 && !(plan.name && plan.name.toLowerCase().includes('free'))
    );
    res.status(200).json({ success: true, data: paidPlans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAgents = async (req, res) => {
  try {
    const agents = await User.find({
      vendorId: req.user._id,
      role: 'agent'
    })
      .select('name phone isActive createdAt')
      .sort({ createdAt: -1 });

    const agentIds = agents.map((agent) => agent._id);
    const { start, end } = getIndiaDayBounds();
    const [paymentTotals, jarTotals, recentSettlements] = agentIds.length
      ? await Promise.all([
        Payment.aggregate([
          {
            $match: {
              vendorId: req.user._id,
              collectedByAgentId: { $in: agentIds },
              paymentMethod: 'cash',
              status: 'captured'
            }
          },
          {
            $group: {
              _id: '$collectedByAgentId',
              todayCash: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ['$paymentDate', start] }, { $lt: ['$paymentDate', end] }] },
                    '$amount',
                    0
                  ]
                }
              },
              pendingCash: {
                $sum: {
                  $cond: [
                    { $eq: [{ $ifNull: ['$agentSettlementId', null] }, null] },
                    '$amount',
                    0
                  ]
                }
              }
            }
          }
        ]),
        Order.aggregate([
          {
            $match: {
              vendorId: req.user._id,
              deliveryAgentId: { $in: agentIds },
              status: 'delivered'
            }
          },
          {
            $group: {
              _id: '$deliveryAgentId',
              jarsCollectedToday: {
                $sum: {
                  $cond: [
                    { $and: [{ $gte: ['$deliveryDate', start] }, { $lt: ['$deliveryDate', end] }] },
                    { $ifNull: ['$bottlesReturned', 0] },
                    0
                  ]
                }
              },
              pendingJars: {
                $sum: {
                  $cond: [
                    { $eq: [{ $ifNull: ['$jarSettlementId', null] }, null] },
                    { $ifNull: ['$bottlesReturned', 0] },
                    0
                  ]
                }
              }
            }
          }
        ]),
        AgentSettlement.find({
          vendorId: req.user._id,
          agentId: { $in: agentIds }
        })
          .sort({ submittedAt: -1 })
          .select('agentId amount submittedAt')
          .lean()
      ])
      : [[], [], []];

    const totalsByAgent = new Map(paymentTotals.map((item) => [item._id.toString(), item]));
    const jarTotalsByAgent = new Map(jarTotals.map((item) => [item._id.toString(), item]));
    const latestByAgent = new Map();
    recentSettlements.forEach((settlement) => {
      const key = settlement.agentId.toString();
      if (!latestByAgent.has(key)) latestByAgent.set(key, settlement);
    });
    const data = agents.map((agent) => {
      const agentData = agent.toObject();
      const totals = totalsByAgent.get(agent._id.toString());
      const jars = jarTotalsByAgent.get(agent._id.toString());
      const latestSettlement = latestByAgent.get(agent._id.toString());
      return {
        ...agentData,
        todayCash: totals?.todayCash || 0,
        jarsCollectedToday: jars?.jarsCollectedToday || 0,
        pendingJars: jars?.pendingJars || 0,
        pendingCash: totals?.pendingCash || 0,
        lastSubmittedAt: latestSettlement?.submittedAt || null,
        lastSubmittedAmount: latestSettlement?.amount || 0
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAgent = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide the agent name and phone number' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Agent phone number must be exactly 10 digits' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered' });
    }

    const agent = await User.create({
      name,
      phone,
      role: 'agent',
      vendorId: req.user._id
    });

    res.status(201).json({
      success: true,
      data: {
        id: agent._id,
        name: agent.name,
        phone: agent.phone,
        isActive: agent.isActive,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignDeliveryAgent = async (req, res) => {
  try {
    const { orderId } = req.params;
    const requestedAgentId = req.body.agentId || null;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: orderId, vendorId: req.user._id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending orders can be assigned' });
    }

    let agent = null;
    if (requestedAgentId) {
      if (!mongoose.Types.ObjectId.isValid(requestedAgentId)) {
        return res.status(400).json({ success: false, message: 'Invalid agent ID' });
      }
      agent = await User.findOne({
        _id: requestedAgentId,
        vendorId: req.user._id,
        role: 'agent',
        isActive: true
      }).select('_id');
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Active delivery agent not found for this vendor' });
      }
    }

    order.deliveryAgentId = agent?._id || null;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        deliveryAgentId: order.deliveryAgentId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitAgentCollection = async (req, res) => {
  let session;
  try {
    const { agentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Invalid agent ID' });
    }

    session = await mongoose.startSession();
    let settlement;
    await session.withTransaction(async () => {
      const agent = await User.findOne({
        _id: agentId,
        vendorId: req.user._id,
        role: 'agent'
      }).session(session);
      if (!agent) {
        const error = new Error('Delivery agent not found for this vendor');
        error.statusCode = 404;
        throw error;
      }

      const pendingPayments = await Payment.find({
        vendorId: req.user._id,
        collectedByAgentId: agent._id,
        paymentMethod: 'cash',
        status: 'captured',
        agentSettlementId: null
      }).session(session);
      if (pendingPayments.length === 0) {
        const error = new Error('This agent has no cash awaiting submission');
        error.statusCode = 409;
        throw error;
      }

      const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
      const paymentIds = pendingPayments.map((payment) => payment._id);
      const amount = pendingPayments.reduce((total, payment) => total + payment.amount, 0);
      const [createdSettlement] = await AgentSettlement.create([{
        vendorId: req.user._id,
        agentId: agent._id,
        paymentIds,
        amount,
        notes
      }], { session });

      const updateResult = await Payment.updateMany(
        {
          _id: { $in: paymentIds },
          vendorId: req.user._id,
          agentSettlementId: null
        },
        { $set: { agentSettlementId: createdSettlement._id } },
        { session }
      );
      if (updateResult.modifiedCount !== paymentIds.length) {
        const error = new Error('Cash submission changed while it was being processed. Please retry.');
        error.statusCode = 409;
        throw error;
      }

      settlement = createdSettlement;
    });

    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

exports.submitAgentJars = async (req, res) => {
  let session;
  try {
    const { agentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ success: false, message: 'Invalid agent ID' });
    }

    session = await mongoose.startSession();
    let settlement;
    await session.withTransaction(async () => {
      const agent = await User.findOne({
        _id: agentId,
        vendorId: req.user._id,
        role: 'agent'
      }).session(session);
      if (!agent) {
        const error = new Error('Delivery agent not found for this vendor');
        error.statusCode = 404;
        throw error;
      }

      const pendingOrders = await Order.find({
        vendorId: req.user._id,
        deliveryAgentId: agent._id,
        status: 'delivered',
        bottlesReturned: { $gt: 0 },
        jarSettlementId: null
      }).session(session);
      if (pendingOrders.length === 0) {
        const error = new Error('This agent has no jars awaiting submission');
        error.statusCode = 409;
        throw error;
      }

      const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
      const orderIds = pendingOrders.map((order) => order._id);
      const jarCount = pendingOrders.reduce((total, order) => total + Number(order.bottlesReturned || 0), 0);
      const [createdSettlement] = await AgentJarSettlement.create([{
        vendorId: req.user._id,
        agentId: agent._id,
        orderIds,
        jarCount,
        notes
      }], { session });

      const updateResult = await Order.updateMany(
        {
          _id: { $in: orderIds },
          vendorId: req.user._id,
          jarSettlementId: null
        },
        { $set: { jarSettlementId: createdSettlement._id } },
        { session }
      );
      if (updateResult.modifiedCount !== orderIds.length) {
        const error = new Error('Jar submission changed while it was being processed. Please retry.');
        error.statusCode = 409;
        throw error;
      }

      settlement = createdSettlement;
    });

    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

// @desc    Update custom product prices for a specific customer
// @route   PUT /api/v1/vendor/customers/:customerId/custom-prices
// @access  Private (Vendor only)
exports.updateCustomerCustomPrices = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { customPrices } = req.body;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    if (!Array.isArray(customPrices)) {
      return res.status(400).json({ success: false, message: 'customPrices must be an array' });
    }

    // Verify products belong to this vendor and clean items
    const vendorProducts = await Product.find({ vendorId }).select('_id');
    const validProductIds = new Set(vendorProducts.map((p) => p._id.toString()));

    const cleanedPrices = [];
    for (const item of customPrices) {
      if (!item || !item.productId) continue;
      const pid = item.productId.toString();
      if (!validProductIds.has(pid)) continue;
      const priceNum = Number(item.price);
      if (Number.isFinite(priceNum) && priceNum >= 0) {
        cleanedPrices.push({
          productId: item.productId,
          price: priceNum
        });
      }
    }

    relation.customPrices = cleanedPrices;
    await relation.save();

    res.status(200).json({
      success: true,
      message: 'Custom prices updated successfully',
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        customPrices: relation.customPrices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set or update a customer-specific custom price for a product
// @route   POST /api/v1/vendor/products/:productId/custom-price
// @access  Private (Vendor only)
exports.setProductCustomPriceForCustomer = async (req, res) => {
  try {
    const { productId } = req.params;
    const { customerId, price } = req.body;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid product or customer ID' });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
    }

    const product = await Product.findOne({ _id: productId, vendorId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found for this vendor' });
    }

    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    const customPrices = (relation.customPrices || []).filter(
      (cp) => cp.productId && cp.productId.toString() !== productId.toString()
    );
    customPrices.push({
      productId: new mongoose.Types.ObjectId(productId),
      price: priceNum
    });

    relation.customPrices = customPrices;
    await relation.save();

    res.status(200).json({
      success: true,
      message: `Custom price of Rs. ${priceNum} set successfully`,
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        productId,
        price: priceNum,
        customPrices: relation.customPrices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove a customer-specific custom price for a product
// @route   DELETE /api/v1/vendor/products/:productId/custom-price/:customerId
// @access  Private (Vendor only)
exports.removeProductCustomPriceForCustomer = async (req, res) => {
  try {
    const { productId, customerId } = req.params;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid product or customer ID' });
    }

    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    relation.customPrices = (relation.customPrices || []).filter(
      (cp) => cp.productId && cp.productId.toString() !== productId.toString()
    );
    await relation.save();

    res.status(200).json({
      success: true,
      message: 'Custom price removed successfully',
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        customPrices: relation.customPrices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report broken / damaged / lost jar with vendor penalty
// @route   POST /api/v1/vendor/customers/:customerId/damage
// @access  Private (Vendor only)
exports.reportJarDamage = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { jarCount, penaltyAmount, notes, deductFromDeposit } = req.body;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    const count = Number(jarCount);
    if (!Number.isInteger(count) || count <= 0) {
      return res.status(400).json({ success: false, message: 'Damaged jar count must be a positive whole number' });
    }

    if (count > relation.bottlesOutstanding) {
      return res.status(400).json({
        success: false,
        message: `Cannot write off ${count} jars. Customer only has ${relation.bottlesOutstanding} jars pending.`
      });
    }

    const penalty = Number(penaltyAmount !== undefined ? penaltyAmount : 0);
    if (isNaN(penalty) || penalty < 0) {
      return res.status(400).json({ success: false, message: 'Penalty amount must be a non-negative number' });
    }

    // Reduce bottles outstanding
    relation.bottlesOutstanding -= count;

    let actuallyDeductedFromDeposit = false;
    if (deductFromDeposit && relation.securityDeposit >= penalty) {
      relation.securityDeposit -= penalty;
      actuallyDeductedFromDeposit = true;
    } else {
      relation.balance += penalty;
    }

    await relation.save();

    const activity = await JarActivity.create({
      vendorId,
      customerId,
      type: 'damage_penalty',
      jarCount: count,
      amount: penalty,
      deductedFromDeposit: actuallyDeductedFromDeposit,
      notes: (notes || '').trim()
    });

    res.status(200).json({
      success: true,
      message: `Recorded ${count} damaged jar(s) with Rs. ${penalty} penalty.`,
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        bottlesOutstanding: relation.bottlesOutstanding,
        balance: relation.balance,
        securityDeposit: relation.securityDeposit,
        activity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refund security deposit to customer
// @route   POST /api/v1/vendor/customers/:customerId/refund-deposit
// @access  Private (Vendor only)
exports.refundSecurityDeposit = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { amount, adjustWithBalance, notes } = req.body;
    const vendorId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    const refundAmount = Number(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Refund amount must be greater than 0' });
    }

    if (refundAmount > (relation.securityDeposit || 0)) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed held deposit of Rs. ${relation.securityDeposit || 0}`
      });
    }

    relation.securityDeposit -= refundAmount;
    if (adjustWithBalance) {
      relation.balance -= refundAmount;
    }

    await relation.save();

    const activity = await JarActivity.create({
      vendorId,
      customerId,
      type: 'deposit_refund',
      amount: refundAmount,
      notes: notes || (adjustWithBalance ? 'Adjusted with outstanding balance' : 'Refunded to customer')
    });

    res.status(200).json({
      success: true,
      message: `Successfully processed Rs. ${refundAmount} deposit refund.`,
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        securityDeposit: relation.securityDeposit,
        balance: relation.balance,
        activity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Profit & Loss analytics
// @route   GET /api/v1/vendor/profit-loss
// @access  Private (Vendor only)
exports.getProfitLossAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const timeframe = req.query.timeframe || 'all';
    const now = new Date();
    const supportedTimeframes = ['today', 'week', 'month', 'year', 'chosenYear', 'all'];
    if (!supportedTimeframes.includes(timeframe)) {
      return res.status(400).json({ success: false, message: 'Unsupported profit and loss timeframe' });
    }
    const year = Number(req.query.year);
    const currentYear = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric'
    }).format(now));
    if (timeframe === 'chosenYear' &&
        (!Number.isInteger(year) || year < 2000 || year > currentYear)) {
      return res.status(400).json({ success: false, message: 'Choose a valid year from 2000 through the current year' });
    }

    const dateRange = getProfitLossDateRange(timeframe, year, now);
    const dateFilter = dateRange
      ? { $gte: dateRange.start, $lt: dateRange.end }
      : null;

    const orderFilter = {
      vendorId,
      status: 'delivered'
    };
    if (dateFilter) {
      orderFilter.$or = [
        { deliveryDate: dateFilter },
        { deliveryDate: null, createdAt: dateFilter }
      ];
    }

    const purchaseFilter = {
      vendorId,
      ...(dateFilter ? { purchaseDate: dateFilter } : {})
    };
    const expenseFilter = {
      vendorId,
      ...(dateFilter ? { expenseDate: dateFilter } : {})
    };

    const [orders, purchases, products] = await Promise.all([
      Order.find(orderFilter).populate('customerId', 'name phone').sort({ createdAt: -1 }),
      Purchase.find(purchaseFilter).sort({ purchaseDate: -1 }),
      Product.find({ vendorId })
    ]);

    const [expenseTotals, expenses] = await Promise.all([
      Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ]),
      Expense.find(expenseFilter).sort({ expenseDate: -1, createdAt: -1 }).limit(100).lean()
    ]);

    const productCostMap = new Map(products.map((p) => [p._id.toString(), p.purchasePrice || 0]));

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalUnitsSold = 0;

    const productMap = new Map();
    const customerMap = new Map();

    for (const order of orders) {
      let orderRevenue = 0;
      let orderCOGS = 0;
      let orderUnits = 0;

      const custId = order.customerId?._id?.toString() || 'unknown';
      const custName = order.customerId?.name || 'Walk-in / Customer';
      const custPhone = order.customerId?.phone || '';

      for (const item of (order.products || [])) {
        const qty = item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : Number(item.quantity || 0);
        if (qty <= 0) continue;

        const unitSellPrice = Number(item.price || 0);
        const fallbackCost = productCostMap.get(item.productId?.toString() || '') || 0;
        const unitCostPrice = (item.purchasePrice !== undefined && item.purchasePrice !== null && item.purchasePrice > 0)
          ? Number(item.purchasePrice)
          : fallbackCost;

        const rev = qty * unitSellPrice;
        const cogs = qty * unitCostPrice;

        orderRevenue += rev;
        orderCOGS += cogs;
        orderUnits += qty;

        // Group by product
        const pKey = item.productId?.toString() || item.name || 'other';
        if (!productMap.has(pKey)) {
          productMap.set(pKey, {
            productId: item.productId,
            name: item.name || 'Unnamed Product',
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0
          });
        }
        const pStat = productMap.get(pKey);
        pStat.unitsSold += qty;
        pStat.revenue += rev;
        pStat.cogs += cogs;
        pStat.profit += (rev - cogs);
      }

      totalRevenue += orderRevenue;
      totalCOGS += orderCOGS;
      totalUnitsSold += orderUnits;

      // Group by customer
      if (!customerMap.has(custId)) {
        customerMap.set(custId, {
          customerId: custId,
          name: custName,
          phone: custPhone,
          ordersCount: 0,
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        });
      }
      const cStat = customerMap.get(custId);
      cStat.ordersCount += 1;
      cStat.unitsSold += orderUnits;
      cStat.revenue += orderRevenue;
      cStat.cogs += orderCOGS;
      cStat.profit += (orderRevenue - orderCOGS);
    }

    const totalPurchasesExpense = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const totalExpenses = Number(expenseTotals[0]?.totalAmount || 0);
    const summary = calculateProfitLossSummary({
      totalRevenue,
      totalCOGS,
      totalExpenses,
      totalPurchasesExpense,
      totalDeliveredOrders: orders.length,
      totalUnitsSold
    });

    const productBreakdown = Array.from(productMap.values()).map((p) => ({
      ...p,
      margin: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.profit - a.profit);

    const customerBreakdown = Array.from(customerMap.values()).map((c) => ({
      ...c,
      margin: c.revenue > 0 ? Number(((c.profit / c.revenue) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.profit - a.profit);

    res.status(200).json({
      success: true,
      data: {
        timeframe,
        ...(timeframe === 'chosenYear' ? { year } : {}),
        summary,
        productBreakdown,
        customerBreakdown,
        expenses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkSubscriptionStatus = checkSubscriptionStatus;

