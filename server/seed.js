/**
 * Seed Script — Create Initial Superadmin
 * ─────────────────────────────────────────
 * Run once to bootstrap your first superadmin account.
 * Usage: node seed.js
 *
 * ⚠️  Delete this file after use or add it to .gitignore
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if superadmin already exists
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      console.log("ℹ️  Superadmin already exists:", existing.email);
      process.exit(0);
    }

    // Create superadmin — password is hashed by the pre-save hook
    const admin = await User.create({
      name: "Super Admin",
      email: "admin@school.edu",
      password: "Admin@123",
      role: "superadmin",
    });

    console.log("🎉 Superadmin created successfully!");
    console.log("   Email:   ", admin.email);
    console.log("   Password: Admin@123  ← Change this immediately after first login!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
