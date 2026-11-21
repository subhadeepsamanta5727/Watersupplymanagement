const User = require('../models/User');
const firebaseAdmin = require('../config/firebase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const { isDemoOtpEnabled, getDemoOtpPhone } = require('../utils/demoOtp');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_water_token_key_123!', {
    expiresIn: '30d'
  });
};

const validatePhone = (phone) => {
  return /^\d{10}$/.test(phone);
};

const getPhoneFromIdToken = async (idToken) => {
  let phone;
  if (typeof idToken === 'string' && idToken.startsWith('DEV_TOKEN_')) {
    phone = getDemoOtpPhone(idToken);
    if (!phone) {
      const error = new Error('Invalid demo OTP');
      error.code = 'INVALID_DEMO_OTP';
      throw error;
    }
    if (!isDemoOtpEnabled(phone)) {
      const error = new Error('Demo OTP authentication is disabled');
      error.code = 'DEMO_OTP_DISABLED';
      throw error;
    }
  }

  if (!phone) {
    if (!firebaseAdmin.auth) {
      const error = new Error('Firebase authentication is not configured');
      error.code = 'FIREBASE_CONFIG';
      throw error;
    }

    const decodedToken = await firebaseAdmin.auth.verifyIdToken(idToken);
    phone = decodedToken.phone_number;
    if (phone && phone.startsWith('+91')) {
      phone = phone.slice(3);
    } else if (phone && phone.startsWith('+')) {
      phone = phone.slice(-10);
    }
  }

  if (!validatePhone(phone)) {
    const error = new Error('Verified token does not contain a valid phone number');
    error.code = 'INVALID_PHONE';
    throw error;
  }
  return phone;
};

// @desc    Register a Vendor
// @route   POST /api/v1/auth/register-vendor
// @access  Public
exports.registerVendor = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    // Check if vendor exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    // Create Vendor
    const vendor = await User.create({
      name,
      phone,
      email,
      password,
      role: 'vendor'
    });

    // Automatically assign default Free Trial plan (10k users, 1 month)
    let freePlan = await SubscriptionPlan.findOne({ name: 'Free Trial' });
    if (!freePlan) {
      freePlan = await SubscriptionPlan.create({
        name: 'Free Trial',
        price: 0,
        duration: 'monthly',
        userLimit: 10000,
        isActive: true
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // 1 month

    await VendorSubscription.create({
      vendorId: vendor._id,
      planId: freePlan._id,
      startDate,
      endDate,
      isActive: true
    });

    res.status(201).json({
      success: true,
      token: generateToken(vendor._id),
      user: {
        id: vendor._id,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        role: vendor.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login Admin/Vendor
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find user by email (or phone, if they entered it in email field)
    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: email }]
    });

    if (!user || !['admin', 'vendor'].includes(user.role)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support/Admin.' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report whether phone login uses demo OTP or Firebase
// @route   POST /api/v1/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res) => {
  const { phone } = req.body || {};
  if (!validatePhone(phone)) {
    return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
  }

  const demoOtpEnabled = isDemoOtpEnabled(phone);
  res.status(200).json({
    success: true,
    demoOtpEnabled,
    message: demoOtpEnabled
      ? 'Demo OTP is enabled. Enter 123456 to continue.'
      : 'OTP should be sent via Firebase Client SDK'
  });
};

// @desc    Verify OTP for login
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Please provide idToken' });
    }

    const phone = await getPhoneFromIdToken(idToken);

    const user = await User.findOne({ phone });

    if (!user) {
      // User is new; tell frontend to prompt for Name & Address
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Account creation needed.',
        phone: phone
      });
    }

    if (!['customer', 'agent'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'This phone number is registered as a business/admin account. Please use the business portal.'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support/Admin.' });
    }

    const userData = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    };
    if (user.role === 'agent') {
      userData.vendorId = user.vendorId;
    } else {
      userData.address = user.address;
      userData.addresses = user.addresses || [];
    }

    res.status(200).json({
      success: true,
      isNewUser: false,
      token: generateToken(user._id),
      user: userData
    });
  } catch (error) {
    if (error.code === 'FIREBASE_CONFIG') {
      return res.status(503).json({ success: false, message: error.message });
    }
    if (error.code === 'INVALID_PHONE') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 'INVALID_DEMO_OTP') {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }
    if (error.code === 'DEMO_OTP_DISABLED') {
      return res.status(401).json({ success: false, message: 'Demo OTP authentication is disabled' });
    }
    console.error("Firebase Auth Error:", error);
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }
};

// @desc    Register a new customer after verifying OTP
// @route   POST /api/v1/auth/register-customer
// @access  Public
exports.registerCustomer = async (req, res) => {
  try {
    const { name, idToken, address } = req.body;

    if (!name || !idToken || !address) {
      return res.status(400).json({ success: false, message: 'Please provide name, idToken and address' });
    }

    const phone = await getPhoneFromIdToken(idToken);

    let user = await User.findOne({ phone });
    if (user) {
      if (user.role !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'This phone number is registered as a business/admin account. Please use the business portal.'
        });
      }
      return res.status(400).json({ success: false, message: 'User with this phone already exists' });
    }

    // Create Customer
    user = await User.create({
      name,
      phone,
      address,
      addresses: address ? [address] : [],
      role: 'customer'
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    if (error.code === 'FIREBASE_CONFIG') {
      return res.status(503).json({ success: false, message: error.message });
    }
    if (error.code === 'INVALID_PHONE') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 'INVALID_DEMO_OTP') {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }
    if (error.code === 'DEMO_OTP_DISABLED') {
      return res.status(401).json({ success: false, message: 'Demo OTP authentication is disabled' });
    }
    console.error("Firebase Auth Error:", error);
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password +razorpayKeySecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const safeUser = user.toObject();
    safeUser.hasRazorpaySecret = Boolean(user.razorpayKeySecret);
    delete safeUser.razorpayKeySecret;
    res.status(200).json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Admins and Vendors only (optional, but requested in prompt)
    if (user.role === 'customer') {
      return res.status(400).json({ success: false, message: 'Customers must use phone authentication' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
