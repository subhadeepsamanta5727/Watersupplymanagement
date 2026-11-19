const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  supplierName: {
    type: String,
    trim: true,
    default: ''
  },
  invoiceNumber: {
    type: String,
    trim: true,
    default: ''
  },
  purchaseDate: {
    type: Date,
    default: Date.now
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
});

purchaseSchema.index({ vendorId: 1, purchaseDate: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
