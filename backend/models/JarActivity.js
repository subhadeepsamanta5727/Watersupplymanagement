const mongoose = require('mongoose');

const jarActivitySchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['damage_penalty', 'deposit_refund', 'deposit_collected'],
    required: true
  },
  jarCount: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    default: 0
  },
  deductedFromDeposit: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

jarActivitySchema.index({ vendorId: 1, customerId: 1, createdAt: -1 });

module.exports = mongoose.model('JarActivity', jarActivitySchema);
