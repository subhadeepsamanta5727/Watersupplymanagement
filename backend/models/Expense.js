const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expenseType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  expenseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

expenseSchema.index({ vendorId: 1, expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
