const mongoose = require("mongoose");

/**
 * Connect to MongoDB with retry logic.
 * Exits the process if connection fails after retries.
 */
const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        // Mongoose 8+ — these are defaults but explicit for clarity
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries -= 1;
      console.error(`❌ MongoDB connection failed. Retries left: ${retries}`);
      console.error(error.message);

      if (retries === 0) {
        console.error("MongoDB connection failed after all retries. Exiting.");
        process.exit(1);
      }
      // Wait 3 seconds before retrying
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
};

module.exports = connectDB;
