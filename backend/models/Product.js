const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: String,
    trim: true,
    default: ''
  },
  stock: {
    type: Number,
    default: 0
  },
  pendingDeliveryStock: {
    type: Number,
    default: 0,
    min: 0
  },
  imageUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ vendorId: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
