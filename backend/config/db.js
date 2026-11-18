const mongoose = require('mongoose');

let isConnected = false;
let dbError = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water_supply_db', {
      serverSelectionTimeoutMS: 8000
    });
    isConnected = true;
    dbError = null;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    isConnected = false;
    dbError = err.message;
    console.error(`MongoDB Connection Error: ${err.message}`);
    throw err;
  }
};

module.exports = {
  connectDB,
  getDbStatus: () => ({ isConnected, dbError })
};
