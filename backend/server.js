const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const VendorSubscription = require('./models/VendorSubscription');

// Load environment variables
dotenv.config();

// Global process error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = express();

// Middlewares
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow to avoid unexpected CORS breaks during initial deployment
  },
  credentials: true
}));
app.use(express.json());

// Mount routers under /api/v1
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/vendor', require('./routes/vendor'));
app.use('/api/v1/agent', require('./routes/agent'));
app.use('/api/v1/customer', require('./routes/customer'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/payment', require('./routes/payment'));

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'water-supply-api' });
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Water Supply API running successfully' });
});

// Seed Initial Admin & default plans helper function
const seedDefaults = async () => {
  try {
    // 1. Seed Admin
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = {
        name: process.env.ADMIN_NAME || 'System Admin',
        phone: process.env.ADMIN_PHONE || '9999999999',
        email: process.env.ADMIN_EMAIL || 'admin@water.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      };

      await User.create({
        ...admin,
        role: 'admin'
      });
      console.log(`Initial admin user seeded: ${admin.email}`);
    }

    // 2. Seed Default Plans
    let freeTrialPlan = await SubscriptionPlan.findOne({ name: 'Free Trial' });
    if (!freeTrialPlan) {
      await SubscriptionPlan.create({
        name: 'Free Trial',
        price: 0,
        duration: 'monthly',
        userLimit: 10000
      });
      console.log('Default Free Trial Plan seeded (up to 10k users, 1 month)');
    }

    let starterPlan = await SubscriptionPlan.findOne({ name: 'Monthly Starter' });
    if (!starterPlan) {
      const createdPlans = await SubscriptionPlan.create([
        {
          name: 'Monthly Starter',
          price: 499,
          duration: 'monthly',
          userLimit: 50
        },
        {
          name: 'Quarterly Pro',
          price: 1299,
          duration: 'quarterly',
          userLimit: 150
        },
        {
          name: 'Yearly Enterprise',
          price: 4499,
          duration: 'yearly',
          userLimit: 500
        }
      ]);
      console.log('Default Subscription Plans seeded (Monthly, Quarterly, Yearly)');
      starterPlan = createdPlans[0];
    }

    // 3. Seed Default Vendor
    const vendorExists = await User.findOne({ role: 'vendor' });
    if (process.env.NODE_ENV !== 'production' && !vendorExists) {
      const vendor = await User.create({
        name: 'AquaFlow Water Suppliers',
        phone: '8888888888',
        email: 'vendor@water.com',
        password: 'vendor123',
        role: 'vendor'
      });
      console.log('Default Vendor user seeded: vendor@water.com / vendor123');

      if (!starterPlan) {
        starterPlan = await SubscriptionPlan.findOne({ name: 'Monthly Starter' });
      }

      if (starterPlan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // 30 days active

        await VendorSubscription.create({
          vendorId: vendor._id,
          planId: starterPlan._id,
          startDate,
          endDate,
          isActive: true
        });
        console.log('Active Monthly Starter subscription assigned to Default Vendor');
      }
    }
  } catch (error) {
    console.error('Error seeding initial data:', error.message);
    throw error;
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedDefaults();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
