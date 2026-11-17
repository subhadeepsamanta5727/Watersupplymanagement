const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  isEncryptionKeyConfigured
} = require('../utils/secretEncryption');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'vendor', 'customer', 'agent'],
    default: 'customer'
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return this.role === 'agent';
    },
    index: true
  },
  address: {
    type: String,
    trim: true
  },
  addresses: {
    type: [String],
    default: []
  },
  razorpayKeyId: {
    type: String,
    trim: true,
    default: ''
  },
  razorpayKeySecret: {
    type: String,
    trim: true,
    default: '',
    select: false,
    set: encryptSecret,
    get: decryptSecret
  },
  deliverySlots: {
    type: [String],
    default: ['Morning (8 AM - 12 PM)', 'Afternoon (12 PM - 4 PM)', 'Evening (4 PM - 8 PM)']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.razorpayKeySecret;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.razorpayKeySecret;
      return ret;
    }
  }
});

userSchema.pre('save', function () {
  const storedSecret = this.get('razorpayKeySecret', null, { getters: false });
  if (storedSecret && !isEncrypted(storedSecret) && isEncryptionKeyConfigured()) {
    this.set('razorpayKeySecret', storedSecret);
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (15 minutes)
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
