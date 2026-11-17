const mongoose = require('mongoose');

const agentSettlementSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  }],
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

agentSettlementSchema.index({ vendorId: 1, submittedAt: -1 });
agentSettlementSchema.index({ agentId: 1, submittedAt: -1 });

module.exports = mongoose.model('AgentSettlement', agentSettlementSchema);
