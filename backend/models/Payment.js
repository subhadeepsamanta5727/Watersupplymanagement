const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  collectedByAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  agentSettlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentSettlement',
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'other'],
    default: 'cash'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'captured', 'cancelled', 'refunded'],
    default: 'captured'
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
  notes: {
    type: String,
    trim: true
  }
});

paymentSchema.index({ vendorId: 1, paymentDate: -1 });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
paymentSchema.index({ vendorId: 1, collectedByAgentId: 1, agentSettlementId: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
