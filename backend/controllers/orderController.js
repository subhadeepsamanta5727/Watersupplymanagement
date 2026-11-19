const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const VendorCustomer = require('../models/VendorCustomer');
const User = require('../models/User');
const Product = require('../models/Product');
const VendorSubscription = require('../models/VendorSubscription');
const { generateReportPDF } = require('../utils/pdfGenerator');
const { parsePagination } = require('../utils/pagination');
const {
  isAssignedAgentForOrder,
  canAgentUpdateOrder
} = require('../utils/deliveryAgentAccess');
const { validateAgentCashCollection } = require('../utils/agentCash');
const {
  allocateDeliveredQuantities,
  getRequestedQuantity,
  validateDeliveredQuantities,
  validateReturnedJarCount
} = require('../utils/orderQuantities');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// @desc    Create an Order
// @route   POST /api/v1/orders
// @access  Private (Vendor or Customer)
exports.createOrder = async (req, res) => {
  let session;
  try {
    const { customerId, products, bottlesDelivered, bottlesReturned, status, deliverySlot, deliveryAddress, saveToProfile } = req.body;
    const isVendor = req.user.role === 'vendor';
    const vendorId = isVendor ? req.user._id : req.body.vendorId;
    const resolvedCustomerId = isVendor ? customerId : req.user._id;

    if (!resolvedCustomerId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide customer and products' });
    }

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(resolvedCustomerId)) {
      return res.status(400).json({ success: false, message: 'Vendor or customer ID is invalid' });
    }
    if (products.some((item) => !item || !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      return res.status(400).json({ success: false, message: 'Each product must have a valid product ID and positive whole-number quantity' });
    }
    if (deliveryAddress !== undefined && typeof deliveryAddress !== 'string') {
      return res.status(400).json({ success: false, message: 'Delivery address must be text' });
    }
    if (new Set(products.map((item) => item.productId.toString())).size !== products.length) {
      return res.status(400).json({ success: false, message: 'A product may only appear once per order' });
    }

    // Verify vendor subscription is active
    const activeSub = await VendorSubscription.findOne({
      vendorId,
      isActive: true,
      endDate: { $gte: new Date() }
    });
    if (!activeSub) {
      return res.status(403).json({
        success: false,
        message: isVendor
          ? 'No active subscription found. Please purchase a plan or contact Admin.'
          : 'This distributor cannot accept new orders due to an inactive subscription.'
      });
    }

    const orderStatus = isVendor ? (status || 'delivered') : 'pending';
    if (!['pending', 'delivered'].includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'New orders can only be pending or delivered' });
    }

    const declaredReturned = Number(bottlesReturned ?? 0);
    if (!Number.isInteger(declaredReturned) || declaredReturned < 0) {
      return res.status(400).json({ success: false, message: 'Returned bottle quantity must be a non-negative whole number' });
    }

    const explicitDelivered = products.some((item) => item.deliveredQuantity !== undefined);
    const declaredDelivered = isVendor && orderStatus === 'delivered'
      ? Number(bottlesDelivered ?? (explicitDelivered ? products.reduce((sum, item) => sum + Number(item.deliveredQuantity || 0), 0) : products.reduce((sum, item) => sum + Number(item.quantity), 0)))
      : 0;
    if (!Number.isInteger(declaredDelivered) || declaredDelivered < 0) {
      return res.status(400).json({ success: false, message: 'Delivered bottle quantity must be a non-negative whole number' });
    }

    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async () => {
      const customerUser = await User.findById(resolvedCustomerId).session(session);
      if (!customerUser || customerUser.role !== 'customer') {
        throw createHttpError(404, 'Customer not found');
      }

      let relation = await VendorCustomer.findOne({
        vendorId,
        customerId: resolvedCustomerId
      }).session(session);
      if (!relation) {
        if (!isVendor) {
          const { checkSubscriptionStatus } = require('./vendorController');
          const subStatus = await checkSubscriptionStatus(vendorId);
          if (!subStatus.active) {
            throw createHttpError(403, 'This distributor cannot accept new orders due to an inactive subscription.');
          }
          if (subStatus.isLimitExceeded) {
            throw createHttpError(403, 'This distributor has reached their customer limit. Please contact the distributor.');
          }
          const [newRelation] = await VendorCustomer.create([{
            vendorId,
            customerId: resolvedCustomerId,
            balance: 0,
            bottlesOutstanding: 0
          }], { session });
          relation = newRelation;
        } else {
          throw createHttpError(400, 'Customer is not connected to this vendor');
        }
      }
      const finalReturned = orderStatus === 'delivered'
        ? validateReturnedJarCount(declaredReturned, relation.bottlesOutstanding, declaredDelivered)
        : 0;

      const dbProducts = await Product.find({
        _id: { $in: products.map((item) => item.productId) },
        vendorId
      }).session(session);
      if (dbProducts.length !== products.length) {
        throw createHttpError(404, 'One or more products were not found for this vendor');
      }

      const productById = new Map(dbProducts.map((product) => [product._id.toString(), product]));

      // Validate stock availability before processing
      for (const item of products) {
        const dbProduct = productById.get(item.productId.toString());
        const requestedQty = Number(item.quantity);
        if (dbProduct.stock < requestedQty) {
          throw createHttpError(
            409,
            `Insufficient stock for ${dbProduct.name}. Only ${dbProduct.stock} left in stock.`
          );
        }
      }

      const customPriceMap = new Map(
        (relation?.customPrices || []).map((cp) => [cp.productId?.toString(), cp.price])
      );

      const orderProducts = products.map((item) => {
        const dbProduct = productById.get(item.productId.toString());
        const customPrice = customPriceMap.get(dbProduct._id.toString());
        const unitSellPrice = (customPrice !== undefined && customPrice !== null)
          ? Number(customPrice)
          : Number(dbProduct.price);
        const unitCostPrice = dbProduct.purchasePrice !== undefined ? Number(dbProduct.purchasePrice) : 0;

        return {
          productId: dbProduct._id,
          name: dbProduct.name,
          quantity: Number(item.quantity),
          requestedQuantity: Number(item.quantity),
          deliveredQuantity: orderStatus === 'delivered' && item.deliveredQuantity !== undefined
            ? Number(item.deliveredQuantity)
            : undefined,
          price: unitSellPrice,
          purchasePrice: unitCostPrice
        };
      });

      let deliveredQuantities = orderStatus === 'delivered'
        ? allocateDeliveredQuantities(orderProducts, declaredDelivered)
        : orderProducts.map(() => 0);
      const finalDelivered = orderStatus === 'delivered'
        ? validateDeliveredQuantities(orderProducts, deliveredQuantities, declaredDelivered)
        : 0;
      if (orderStatus === 'delivered' && finalDelivered === 0 && finalReturned === 0) {
        throw createHttpError(400, 'Either delivery quantity or return quantity must be greater than 0');
      }

      orderProducts.forEach((item, index) => {
        item.deliveredQuantity = deliveredQuantities[index];
      });
      const totalAmount = orderProducts.reduce((sum, item) =>
        sum + item.price * (orderStatus === 'delivered' ? item.deliveredQuantity : item.quantity), 0);
      const finalDeliveryAddress = (deliveryAddress && deliveryAddress.trim()) || customerUser.address || '';

      if (!isVendor && saveToProfile && deliveryAddress && deliveryAddress.trim()) {
        const trimmedAddress = deliveryAddress.trim();
        const addresses = customerUser.addresses || [];
        const exists = addresses.some((addr) =>
          addr.toLowerCase() === trimmedAddress.toLowerCase());
        if (!exists && addresses.length < 5) {
          customerUser.addresses = addresses;
          customerUser.addresses.push(trimmedAddress);
          if (!customerUser.address) customerUser.address = trimmedAddress;
          await customerUser.save({ session });
        }
      }

      order = new Order({
        vendorId,
        customerId: resolvedCustomerId,
        products: orderProducts,
        totalAmount,
        bottlesDelivered: finalDelivered,
        bottlesReturned: finalReturned,
        status: orderStatus,
        deliverySlot: deliverySlot || '',
        deliveryAddress: finalDeliveryAddress,
        deliveryDate: orderStatus === 'delivered' ? new Date() : null
      });
      await order.save({ session });

      if (orderStatus === 'pending') {
        // Reserve stock immediately: deduct from stock, add to pendingDeliveryStock
        for (const item of orderProducts) {
          const qty = item.quantity;
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.productId, vendorId, stock: { $gte: qty } },
            { $inc: { stock: -qty, pendingDeliveryStock: qty } },
            { new: true, session }
          );
          if (!updatedProduct) {
            throw createHttpError(409, `Insufficient stock for ${item.name}. Another customer may have just purchased the remaining stock.`);
          }
          await Product.updateOne(
            { _id: item.productId, vendorId, stock: updatedProduct.stock },
            { $set: { isActive: updatedProduct.stock > 0 } },
            { session }
          );
        }
      } else if (orderStatus === 'delivered') {
        relation.balance += totalAmount;
        relation.bottlesOutstanding += finalDelivered - finalReturned;
        await relation.save({ session });

        // Immediate walk-in delivery: deduct directly from stock
        for (const item of orderProducts) {
          if (!item.deliveredQuantity) continue;
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.productId, vendorId, stock: { $gte: item.deliveredQuantity } },
            { $inc: { stock: -item.deliveredQuantity } },
            { new: true, session }
          );
          if (!updatedProduct) {
            throw createHttpError(409, `Insufficient stock for ${item.name}`);
          }
          await Product.updateOne(
            { _id: item.productId, vendorId, stock: updatedProduct.stock },
            { $set: { isActive: updatedProduct.stock > 0 } },
            { session }
          );
        }
      }
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

// @desc    Update Order Status (e.g. Pending -> Delivered)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res) => {
  let session;
  try {
    const body = req.body || {};
    const { status, bottlesDelivered, bottlesReturned, products: deliveredItems } = body;
    const isAgent = req.user.role === 'agent';
    if (!['delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be delivered or cancelled' });
    }
    if (isAgent && !canAgentUpdateOrder(body)) {
      return res.status(403).json({ success: false, message: 'Agents can only mark assigned orders as delivered' });
    }

    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async () => {
      order = await Order.findById(req.params.id).session(session);
      if (!order) throw createHttpError(404, 'Order not found');
      if (isAgent) {
        if (!isAssignedAgentForOrder(req.user, order)) {
          throw createHttpError(403, 'Not authorized for this delivery');
        }
      } else if (order.vendorId.toString() !== req.user._id.toString()) {
        throw createHttpError(403, 'Not authorized');
      }
      const vendorId = order.vendorId;

      const previousStatus = order.status;
      if (previousStatus === 'cancelled') {
        throw createHttpError(400, 'Cancelled orders cannot be changed');
      }
      if (previousStatus === 'delivered' && status !== 'cancelled') {
        throw createHttpError(400, 'Delivered orders can only be cancelled');
      }

      const relation = await VendorCustomer.findOne({
        vendorId,
        customerId: order.customerId
      }).session(session);
      if (!relation) throw createHttpError(404, 'Customer relationship not found');

      if (status === 'delivered') {
        if (previousStatus !== 'pending') {
          throw createHttpError(400, 'Only pending orders can be delivered');
        }

        const orderProducts = order.products.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: getRequestedQuantity(item),
          requestedQuantity: getRequestedQuantity(item),
          price: item.price,
          purchasePrice: item.purchasePrice || 0,
          deliveredQuantity: undefined
        }));

        if (isAgent) {
          if (!Array.isArray(deliveredItems) || deliveredItems.length !== order.products.length) {
            throw createHttpError(400, 'Provide a delivered quantity for every product');
          }
          const submittedProductIds = deliveredItems.map((item) => item?.productId?.toString());
          const orderProductIds = order.products.map((item) => item.productId.toString());
          if (
            new Set(submittedProductIds).size !== orderProductIds.length ||
            orderProductIds.some((productId) => !submittedProductIds.includes(productId))
          ) {
            throw createHttpError(400, 'Delivered products do not match this order');
          }
        }

        if (Array.isArray(deliveredItems)) {
          const itemDeliveries = new Map(
            deliveredItems.map((item) => [item.productId?.toString(), Number(item.deliveredQuantity)])
          );
          for (const item of orderProducts) {
            if (itemDeliveries.has(item.productId.toString())) {
              item.deliveredQuantity = itemDeliveries.get(item.productId.toString());
            }
          }
        }

        const hasItemDeliveries = orderProducts.some((item) => item.deliveredQuantity !== undefined);
        const declaredTotal = bottlesDelivered !== undefined
          ? Number(bottlesDelivered)
          : hasItemDeliveries
            ? orderProducts.reduce((sum, item) => sum + Number(item.deliveredQuantity || 0), 0)
            : orderProducts.reduce((sum, item) => sum + item.requestedQuantity, 0);
        if (!Number.isInteger(declaredTotal) || declaredTotal < 0) {
          throw createHttpError(400, 'Delivered bottle quantity must be a non-negative whole number');
        }

        const deliveredQuantities = allocateDeliveredQuantities(orderProducts, declaredTotal);
        const totalDelivered = validateDeliveredQuantities(orderProducts, deliveredQuantities, declaredTotal);
        const totalReturned = validateReturnedJarCount(
          bottlesReturned,
          relation.bottlesOutstanding,
          totalDelivered
        );
        if (isAgent && totalDelivered === 0 && totalReturned === 0) {
          throw createHttpError(400, 'Deliver products or collect empty jars before completing this delivery');
        }

        order.products.forEach((item, index) => {
          item.requestedQuantity = orderProducts[index].requestedQuantity;
          item.deliveredQuantity = deliveredQuantities[index];
        });
        order.totalAmount = order.products.reduce(
          (sum, item) => sum + item.price * item.deliveredQuantity,
          0
        );
        order.bottlesDelivered = totalDelivered;
        order.bottlesReturned = totalReturned;
        order.status = 'delivered';
        order.deliveryDate = new Date();

        relation.balance += order.totalAmount;
        relation.bottlesOutstanding += totalDelivered - totalReturned;

        for (const item of order.products) {
          const requestedQty = getRequestedQuantity(item);
          const deliveredQty = Number(item.deliveredQuantity || 0);
          const undeliveredQty = Math.max(0, requestedQty - deliveredQty);

          const prod = await Product.findById(item.productId).session(session);
          if (prod) {
            // Deduct from pendingDeliveryStock since order is fulfilled
            prod.pendingDeliveryStock = Math.max(0, (prod.pendingDeliveryStock || 0) - requestedQty);
            // If partial delivery, return undelivered portion back to available stock
            if (undeliveredQty > 0) {
              prod.stock += undeliveredQty;
              prod.isActive = prod.stock > 0;
            }
            await prod.save({ session });
          }
        }

        const { paymentMethod, paymentAmount } = body;
        if (isAgent) {
          const cashCollected = validateAgentCashCollection(
            body.cashCollected,
            order.totalAmount,
            relation.balance
          );
          if (cashCollected > 0) {
            await Payment.create([{
              vendorId,
              customerId: order.customerId,
              orderId: order._id,
              collectedByAgentId: req.user._id,
              amount: cashCollected,
              paymentMethod: 'cash',
              notes: `Collected by delivery agent (Order: ${order._id.toString().slice(-6)})`
            }], { session });
            relation.balance -= cashCollected;
          }
        } else if (paymentMethod === 'cash') {
          const cashAmount = paymentAmount !== undefined ? Number(paymentAmount) : order.totalAmount;
          if (!Number.isFinite(cashAmount) || cashAmount < 0) {
            throw createHttpError(400, 'Cash payment amount must be a non-negative number');
          }
          if (cashAmount > 0) {
            await Payment.create([{
              vendorId,
              customerId: order.customerId,
              amount: cashAmount,
              paymentMethod: 'cash',
              notes: `Paid on delivery (Order: ${order._id.toString().slice(-6)})`
            }], { session });
            relation.balance -= cashAmount;
          }
        }
      } else if (previousStatus === 'delivered') {
        relation.balance -= order.totalAmount;
        relation.bottlesOutstanding -= order.bottlesDelivered - order.bottlesReturned;

        const linkedPayments = await Payment.find({
          orderId: order._id,
          vendorId,
          status: 'captured'
        }).session(session);

        for (const payment of linkedPayments) {
          relation.balance += payment.amount;
          payment.status = 'cancelled';
          payment.notes = (payment.notes ? payment.notes + ' ' : '') + `[Cancelled with Order #${order._id.toString().slice(-6)}]`;
          await payment.save({ session });
        }

        if (!order.jarSettlementId) {
          order.bottlesReturned = 0;
          order.bottlesDelivered = 0;
        }

        for (const item of order.products) {
          const deliveredQuantity = item.deliveredQuantity ?? item.quantity;
          if (deliveredQuantity > 0) {
            await Product.updateOne(
              { _id: item.productId, vendorId },
              { $inc: { stock: deliveredQuantity }, $set: { isActive: true } },
              { session }
            );
          }
        }
        order.status = 'cancelled';
      } else {
        // previousStatus was 'pending': restore reserved stock back to available stock
        for (const item of order.products) {
          const requestedQty = getRequestedQuantity(item);
          if (requestedQty > 0) {
            const prod = await Product.findById(item.productId).session(session);
            if (prod) {
              prod.stock += requestedQty;
              prod.pendingDeliveryStock = Math.max(0, (prod.pendingDeliveryStock || 0) - requestedQty);
              prod.isActive = prod.stock > 0;
              await prod.save({ session });
            }
          }
        }
        order.status = 'cancelled';
      }

      if (body.deliveryNotes !== undefined) {
        order.deliveryNotes = typeof body.deliveryNotes === 'string' ? body.deliveryNotes.trim() : '';
      }

      await relation.save({ session });
      await order.save({ session });
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

// @desc    Record customer payment
// @route   POST /api/v1/orders/payments
// @access  Private (Vendor only)
exports.recordPayment = async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, notes } = req.body;

    if (!customerId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide customer and amount' });
    }

    const relation = await VendorCustomer.findOne({
      vendorId: req.user._id,
      customerId
    });

    if (!relation) {
      return res.status(400).json({ success: false, message: 'Customer not linked to vendor' });
    }

    // Save payment
    const payment = await Payment.create({
      vendorId: req.user._id,
      customerId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      notes
    });

    // Deduct payment amount from user outstanding balance
    relation.balance -= amount;
    await relation.save();

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders of the vendor
// @route   GET /api/v1/orders
// @access  Private (Vendor/Customer)
exports.getOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'vendor') {
      query.vendorId = req.user._id;
      if (req.query.customerId) {
        query.customerId = req.query.customerId;
      }
    } else if (req.user.role === 'agent') {
      query.deliveryAgentId = req.user._id;
      query.vendorId = req.user.vendorId;
    } else if (req.user.role === 'customer') {
      query.customerId = req.user._id;
      if (req.query.vendorId) {
        query.vendorId = req.query.vendorId;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const pagination = parsePagination(req.query);
    let orderQuery = Order.find(query)
      .populate('customerId', 'name phone address')
      .populate('vendorId', 'name phone')
      .populate('deliveryAgentId', 'name')
      .sort({ createdAt: -1, _id: -1 });
    let pageInfo;
    if (pagination) {
      const total = await Order.countDocuments(query);
      orderQuery = orderQuery.skip((pagination.page - 1) * pagination.limit).limit(pagination.limit);
      pageInfo = {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      };
    }
    const orders = await orderQuery;

    res.status(200).json({
      success: true,
      count: pageInfo ? pageInfo.total : orders.length,
      ...(pageInfo ? { pagination: pageInfo } : {}),
      data: orders
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all payments logged
// @route   GET /api/v1/orders/payments
// @access  Private (Vendor/Customer)
exports.getPayments = async (req, res) => {
  try {
    let query = { status: { $ne: 'pending' } };
    if (req.user.role === 'vendor') {
      query.vendorId = req.user._id;
      if (req.query.customerId) {
        query.customerId = req.query.customerId;
      }
    } else if (req.user.role === 'customer') {
      query.customerId = req.user._id;
      if (req.query.vendorId) {
        query.vendorId = req.query.vendorId;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const pagination = parsePagination(req.query);
    let paymentQuery = Payment.find(query)
      .populate('customerId', 'name phone address')
      .populate('vendorId', 'name phone')
      .sort({ paymentDate: -1, _id: -1 });
    let pageInfo;
    if (pagination) {
      const total = await Payment.countDocuments(query);
      paymentQuery = paymentQuery.skip((pagination.page - 1) * pagination.limit).limit(pagination.limit);
      pageInfo = {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      };
    }
    const payments = await paymentQuery;

    res.status(200).json({
      success: true,
      count: pageInfo ? pageInfo.total : payments.length,
      ...(pageInfo ? { pagination: pageInfo } : {}),
      data: payments
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Statement PDF
// @route   GET /api/v1/orders/pdf-report
// @access  Private (Vendor only)
exports.exportPDFReport = async (req, res) => {
  try {
    const { customerId } = req.query;
    const vendorId = req.user._id;

    const vendor = await User.findById(vendorId).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    let customer = null;
    let stats = {};
    let orderQuery = { vendorId };
    let payQuery = { vendorId };

    if (customerId) {
      customer = await User.findById(customerId).select('-password');
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      
      const relation = await VendorCustomer.findOne({ vendorId, customerId });
      if (!relation) return res.status(400).json({ success: false, message: 'Customer not connected' });
      
      stats = {
        balance: relation.balance,
        bottlesOutstanding: relation.bottlesOutstanding
      };
      orderQuery.customerId = customerId;
      payQuery.customerId = customerId;
    } else {
      // Vendor aggregate stats
      const customerCount = await VendorCustomer.countDocuments({ vendorId });
      stats = { customerCount };
    }

    const orders = await Order.find(orderQuery)
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
    
    const payments = await Payment.find({ ...payQuery, status: { $ne: 'pending' } })
      .populate('customerId', 'name phone')
      .sort({ paymentDate: -1 });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=water_report_${customerId || 'general'}.pdf`);

    generateReportPDF(res, {
      vendor,
      customer,
      orders,
      payments,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
