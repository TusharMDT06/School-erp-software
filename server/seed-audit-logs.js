/**
 * seed-audit-logs.js
 * Populates realistic login and audit history logs matching user screenshot.
 */

const mongoose = require("mongoose");
require("dotenv").config();
const AuditLog = require("./src/models/AuditLog.model");
const User = require("./src/models/User.model");

const seedAuditLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Fetch existing users to link where appropriate
    const adminUser = await User.findOne({ role: { $in: ["admin", "superadmin"] } });
    const principalUser = await User.findOne({ role: "principal" });
    const teacherUser = await User.findOne({ role: "teacher" });
    const studentUser = await User.findOne({ role: "student" });
    const accountantUser = await User.findOne({ role: "accountant" });
    const parentUser = await User.findOne({ role: "parent" });

    const sampleLogs = [
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "223.184.174.129",
        device: "Windows",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        details: "User authenticated successfully",
        createdAt: new Date("2026-10-03T21:26:38+05:30"),
      },
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "103.197.79.124",
        device: "Android Chrome",
        deviceType: "mobile",
        browser: "Chrome",
        os: "Android",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        details: "User authenticated successfully",
        createdAt: new Date("2026-10-01T10:25:13+05:30"),
      },
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "::1",
        device: "macOS",
        deviceType: "desktop",
        browser: "Chrome",
        os: "macOS",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-30T18:13:47+05:30"),
      },
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGIN",
        status: "FAILED",
        ip: "::1",
        device: "macOS",
        deviceType: "desktop",
        browser: "Chrome",
        os: "macOS",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        details: "Failed login: incorrect password",
        createdAt: new Date("2026-09-30T18:13:41+05:30"),
      },
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "138.199.21.211",
        device: "Android Chrome",
        deviceType: "mobile",
        browser: "Chrome",
        os: "Android",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-29T20:01:45+05:30"),
      },
      {
        userName: principalUser?.name || "Dr. Rajeshwar Sharma",
        userRole: "PRINCIPAL",
        userId: principalUser?._id,
        schoolId: principalUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "103.197.79.124",
        device: "Windows",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-29T09:15:20+05:30"),
      },
      {
        userName: teacherUser?.name || "Vikram Malhotra",
        userRole: "TEACHER",
        userId: teacherUser?._id,
        schoolId: teacherUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "223.184.174.129",
        device: "Windows",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-28T08:30:10+05:30"),
      },
      {
        userName: accountantUser?.name || "Manoj Goyal",
        userRole: "ACCOUNTANT",
        userId: accountantUser?._id,
        schoolId: accountantUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "152.58.112.45",
        device: "Windows",
        deviceType: "desktop",
        browser: "Edge",
        os: "Windows",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-27T10:05:40+05:30"),
      },
      {
        userName: parentUser?.name || "Parent Account",
        userRole: "PARENT",
        userId: parentUser?._id,
        schoolId: parentUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "103.197.79.124",
        device: "Android Chrome",
        deviceType: "mobile",
        browser: "Chrome",
        os: "Android",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-26T19:42:15+05:30"),
      },
      {
        userName: studentUser?.name || "Aarav Patel",
        userRole: "STUDENT",
        userId: studentUser?._id,
        schoolId: studentUser?.schoolId,
        action: "LOGIN",
        status: "SUCCESS",
        ip: "223.184.174.129",
        device: "Windows",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        details: "User authenticated successfully",
        createdAt: new Date("2026-09-25T16:20:00+05:30"),
      },
      {
        userName: "unknown_user",
        userRole: "UNKNOWN",
        action: "LOGIN",
        status: "FAILED",
        ip: "45.132.88.10",
        device: "Linux",
        deviceType: "desktop",
        browser: "Firefox",
        os: "Linux",
        details: "Failed login: user not found",
        createdAt: new Date("2026-09-25T02:11:05+05:30"),
      },
      {
        userName: "admin",
        userRole: "ADMIN",
        userId: adminUser?._id,
        schoolId: adminUser?.schoolId,
        action: "LOGOUT",
        status: "SUCCESS",
        ip: "223.184.174.129",
        device: "Windows",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        details: "User logged out successfully",
        createdAt: new Date("2026-09-24T22:45:00+05:30"),
      },
    ];

    for (const item of sampleLogs) {
      await AuditLog.create({
        ...item,
        module: "auth",
      });
    }

    console.log(`Successfully seeded ${sampleLogs.length} audit logs!`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed audit logs:", err);
    process.exit(1);
  }
};

seedAuditLogs();
