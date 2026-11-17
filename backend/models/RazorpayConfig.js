const mongoose = require('mongoose');
const {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  isEncryptionKeyConfigured
} = require('../utils/secretEncryption');

const razorpayConfigSchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    trim: true
  },
  keySecret: {
    type: String,
    required: true,
    trim: true,
    select: false,
    set: encryptSecret,
    get: decryptSecret
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.keySecret;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.keySecret;
      return ret;
    }
  }
});

razorpayConfigSchema.pre('save', function () {
  const storedSecret = this.get('keySecret', null, { getters: false });
  if (storedSecret && !isEncrypted(storedSecret) && isEncryptionKeyConfigured()) {
    this.set('keySecret', storedSecret);
  }
});

module.exports = mongoose.model('RazorpayConfig', razorpayConfigSchema);
