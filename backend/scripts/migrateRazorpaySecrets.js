require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const RazorpayConfig = require('../models/RazorpayConfig');
const { isEncrypted } = require('../utils/secretEncryption');

const migrateSecrets = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ razorpayKeySecret: { $exists: true, $ne: '' } })
    .select('+razorpayKeySecret');
  let migrated = 0;
  for (const user of users) {
    const storedSecret = user.get('razorpayKeySecret', null, { getters: false });
    if (storedSecret && !isEncrypted(storedSecret)) {
      user.razorpayKeySecret = user.razorpayKeySecret;
      await user.save();
      migrated += 1;
    }
  }

  const configs = await RazorpayConfig.find().select('+keySecret');
  for (const config of configs) {
    const storedSecret = config.get('keySecret', null, { getters: false });
    if (storedSecret && !isEncrypted(storedSecret)) {
      config.keySecret = config.keySecret;
      await config.save();
      migrated += 1;
    }
  }

  console.log(`Encrypted ${migrated} legacy Razorpay secret(s).`);
};

migrateSecrets()
  .catch((error) => {
    console.error('Razorpay secret migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
