const mongoose = require('mongoose');

let isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rca-greenhub';
  console.log(`Attempting to connect to MongoDB at: ${uri}...`);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Timeout quickly to activate fallback mode
    });
    isMongoConnected = true;
    console.log('✔ MongoDB Connected Successfully!');
  } catch (err) {
    isMongoConnected = false;
    console.warn('⚠ MongoDB connection failed. Running in IN-MEMORY DATABASE FALLBACK MODE.');
    console.warn(`Reason: ${err.message}`);
  }
};

module.exports = {
  connectDB,
  isConnected: () => isMongoConnected
};
