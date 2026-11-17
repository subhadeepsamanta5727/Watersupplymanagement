const mongoose = require('mongoose');

const agentJarSettlementSchema = new mongoose.Schema({
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
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  }],
  jarCount: {
    type: Number,
    required: true,
    min: 1
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

agentJarSettlementSchema.index({ vendorId: 1, submittedAt: -1 });
agentJarSettlementSchema.index({ agentId: 1, submittedAt: -1 });

module.exports = mongoose.model('AgentJarSettlement', agentJarSettlementSchema);
