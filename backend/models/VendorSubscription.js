const mongoose = require('mongoose');

const vendorSubscriptionSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  pricePaid: {
    type: Number,
    min: 0,
    default: 0
  },
  purchaseAmount: {
    type: Number,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'captured', 'not_required'],
    default: 'not_required'
  },
  razorpayOrderId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

vendorSubscriptionSchema.index({ vendorId: 1, isActive: 1, endDate: 1 });

module.exports = mongoose.model('VendorSubscription', vendorSubscriptionSchema);
