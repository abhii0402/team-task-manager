const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // If no valid MongoDB URI, use in-memory server for development
    if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('xxxxx') || uri === '') {
      console.log('⚡ No MongoDB URI configured — starting in-memory database...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log('⚡ In-memory MongoDB started.');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
