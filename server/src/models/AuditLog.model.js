const mongoose = require("mongoose");

/**
 * AuditLog — tracks all user logins, authentication attempts,
 * security events, and administrative/financial mutations.
 */
const auditLogSchema = new mongoose.Schema(
  {
    schoolId:   { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userName:   { type: String, trim: true, default: null, index: true },
    userRole:   { type: String, trim: true, default: "unknown", index: true },
    action:     { type: String, required: true, trim: true, index: true }, // LOGIN, LOGOUT, PASSWORD_RESET, etc.
    status:     { type: String, enum: ["SUCCESS", "FAILED", "WARNING", "PENDING"], default: "SUCCESS", index: true },
    module:     { type: String, default: "general", trim: true, index: true }, // "auth", "fee_counter", etc.
    targetId:   { type: String, default: null },
    oldValue:   { type: String, default: null }, // JSON string
    newValue:   { type: String, default: null }, // JSON string
    ip:         { type: String, default: null, trim: true },
    device:     { type: String, default: null, trim: true }, // e.g. "Windows", "Android Chrome", "macOS"
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "desktop" },
    browser:    { type: String, default: null, trim: true },
    os:         { type: String, default: null, trim: true },
    details:    { type: String, default: null, trim: true }, // e.g. "User authenticated successfully"
    userAgent:  { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ schoolId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ip: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

