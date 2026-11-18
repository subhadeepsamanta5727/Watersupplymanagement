const mongoose = require('mongoose');

let isConnected = false;
let dbError = null;
let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    dbError = null;
    return mongoose.connection;
  }
  if (isConnecting) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water_supply_db', {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    dbError = null;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    isConnected = false;
    dbError = err.message;
    console.error(`MongoDB Connection Error: ${err.message}`);
    // Auto-retry in 10 seconds if disconnected
    setTimeout(() => {
      connectDB().catch(() => {});
    }, 10000);
    throw err;
  } finally {
    isConnecting = false;
  }
};

// Also listen to mongoose events
mongoose.connection.on('connected', () => {
  isConnected = true;
  dbError = null;
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  dbError = err.message;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  // Trigger reconnection attempt
  setTimeout(() => {
    connectDB().catch(() => {});
  }, 10000);
});

module.exports = {
  connectDB,
  getDbStatus: () => ({
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    dbError
  })
};
