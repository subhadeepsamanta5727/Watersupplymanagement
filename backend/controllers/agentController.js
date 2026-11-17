const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const VendorCustomer = require('../models/VendorCustomer');
const AgentSettlement = require('../models/AgentSettlement');
const { parsePagination } = require('../utils/pagination');
const { getIndiaDayBounds } = require('../utils/indiaDate');

exports.getDashboard = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const agentId = req.user._id;
    if (!vendorId) {
      return res.status(403).json({ success: false, message: 'Delivery agent has no vendor account' });
    }

    const vendor = await User.findById(vendorId).select('name').lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'The vendor assigned to this agent could not be found.' });
    }

    const query = { vendorId, status: 'pending' };
    const scope = req.query.scope;
    if (scope === 'mine') {
      query.deliveryAgentId = agentId;
    } else if (scope === 'unassigned') {
      query.$or = [{ deliveryAgentId: null }, { deliveryAgentId: { $exists: false } }];
    } else if (scope === 'available') {
      query.$or = [{ deliveryAgentId: null }, { deliveryAgentId: agentId }, { deliveryAgentId: { $exists: false } }];
    }
    const pagination = parsePagination(req.query);
    let orderQuery = Order.find(query)
      .populate('customerId', 'name phone address')
      .populate('deliveryAgentId', 'name')
      .sort({ createdAt: 1, _id: 1 });
    let pageInfo;

    if (pagination) {
      const total = await Order.countDocuments(query);
      orderQuery = orderQuery
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
      pageInfo = {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      };
    }

    const orders = await orderQuery;
    const customerIds = [...new Set(orders.map((order) => order.customerId?._id?.toString()).filter(Boolean))];
    const relationships = await VendorCustomer.find({
      vendorId,
      customerId: { $in: customerIds }
    }).select('customerId bottlesOutstanding').lean();
    const jarsByCustomer = new Map(
      relationships.map((relationship) => [
        relationship.customerId.toString(),
        relationship.bottlesOutstanding
      ])
    );

    const data = orders.map((order) => {
      const row = order.toObject();
      const isClaimedByAgent = row.deliveryAgentId?._id?.toString() === agentId.toString();
      const isClaimedByOther = Boolean(row.deliveryAgentId && !isClaimedByAgent);
      if (row.customerId) {
        row.customerId.bottlesOutstanding = jarsByCustomer.get(row.customerId._id.toString()) || 0;
      }
      if (!isClaimedByAgent) {
        delete row.totalAmount;
        row.products = row.products.map(({ price, ...product }) => product);
      }
      if (isClaimedByOther) {
        row.customerId = { name: row.customerId?.name || 'Customer' };
        row.deliveryAddress = '';
      }
      return row;
    });

    const { start, end } = getIndiaDayBounds();
    const [paymentTotals, completedToday, jarsCollectedToday, assignedToMe, latestSettlements] = await Promise.all([
      Payment.aggregate([
        { $match: {
          vendorId,
          collectedByAgentId: agentId,
          paymentMethod: 'cash',
          status: 'captured'
        } },
        {
          $group: {
            _id: null,
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
      Order.countDocuments({
        vendorId,
        deliveryAgentId: agentId,
        status: 'delivered',
        deliveryDate: { $gte: start, $lt: end }
      }),
      Order.aggregate([
        {
          $match: {
            vendorId,
            deliveryAgentId: agentId,
            status: 'delivered',
            deliveryDate: { $gte: start, $lt: end }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$bottlesReturned', 0] } }
          }
        }
      ]),
      Order.countDocuments({ vendorId, deliveryAgentId: agentId, status: 'pending' }),
      AgentSettlement.find({ vendorId, agentId })
        .sort({ submittedAt: -1 })
        .limit(5)
        .select('amount submittedAt')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      ...(pageInfo ? { pagination: pageInfo } : {}),
      data: {
        vendor: { name: vendor.name },
        orders: data,
        stats: {
          openDeliveries: pageInfo ? pageInfo.total : orders.length,
          assignedToMe,
          completedToday,
          jarsCollectedToday: jarsCollectedToday[0]?.total || 0,
          todayCash: paymentTotals[0]?.todayCash || 0,
          pendingCash: paymentTotals[0]?.pendingCash || 0
        },
        settlements: latestSettlements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.claimOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        vendorId: req.user.vendorId,
        status: 'pending',
        $or: [{ deliveryAgentId: null }, { deliveryAgentId: { $exists: false } }]
      },
      { $set: { deliveryAgentId: req.user._id } },
      { new: true }
    ).populate('deliveryAgentId', 'name');

    if (order) {
      return res.status(200).json({ success: true, data: order });
    }

    const existingOrder = await Order.findOne({
      _id: req.params.orderId,
      vendorId: req.user.vendorId
    }).select('status deliveryAgentId').populate('deliveryAgentId', 'name');
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    res.status(409).json({
      success: false,
      message: existingOrder.status !== 'pending'
        ? 'This delivery is no longer open'
        : `This delivery was already claimed${existingOrder.deliveryAgentId?.name ? ` by ${existingOrder.deliveryAgentId.name}` : ''}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.releaseOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        vendorId: req.user.vendorId,
        status: 'pending',
        deliveryAgentId: req.user._id
      },
      { $set: { deliveryAgentId: null } },
      { new: true }
    );
    if (!order) {
      return res.status(409).json({ success: false, message: 'This delivery is not currently claimed by you' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
