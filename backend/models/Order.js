const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  jarSettlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentJarSettlement',
    default: null
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    requestedQuantity: {
      type: Number,
      min: 0
    },
    deliveredQuantity: {
      type: Number,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0
    },
    isReturnable: {
      type: Boolean,
      default: true
    }
  }],
  securityDepositCharged: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  bottlesDelivered: {
    type: Number,
    default: 0
  },
  bottlesReturned: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliverySlot: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryAddress: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryNotes: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.index({ vendorId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ vendorId: 1, status: 1 });
orderSchema.index({ deliveryAgentId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
