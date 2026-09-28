const mongoose = require("mongoose");

/**
 * AuditLog — tracks all financial and administrative mutations.
 * Used by auditLog utility helper.
 */
const auditLogSchema = new mongoose.Schema(
  {
    schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action:    { type: String, required: true, trim: true },
    module:    { type: String, default: "general", trim: true },
    targetId:  { type: String, default: null },
    oldValue:  { type: String, default: null },  // JSON string
    newValue:  { type: String, default: null },  // JSON string
    ip:        { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ schoolId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
