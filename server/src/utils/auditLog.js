/**
 * auditLog.js — Helper to write financial audit entries.
 * Call from EVERY financial mutation in Phase 7A.
 */

const AuditLog = require("../models/AuditLog.model");

/**
 * @param {Object} params
 * @param {string} [params.schoolId]    - School id for multi-tenancy
 * @param {string} params.userId      - Actor user id
 * @param {string} params.action      - e.g. "fee_collected", "refund_approved"
 * @param {string} params.module      - e.g. "fee_counter", "concession", "refund"
 * @param {*}      params.targetId    - Primary entity id (transaction, concession, refund)
 * @param {*}      [params.oldValue]  - Before-state (serializable)
 * @param {*}      [params.newValue]  - After-state (serializable)
 * @param {string} [params.ip]        - Request IP address
 */
const auditLog = async ({ schoolId, userId, action, module: mod, targetId, oldValue, newValue, ip } = {}) => {
  try {
    // AuditLog model may not exist in older codebase — create gracefully
    if (!AuditLog) return;
    await AuditLog.create({
      schoolId: schoolId || undefined,
      userId,
      action,
      module: mod,
      targetId: targetId?.toString?.() ?? targetId,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : undefined,
      ip,
    });
  } catch (err) {
    // Audit log failure must never crash the main request
    console.error("[AuditLog] Failed to write audit entry:", err.message);
  }
};

module.exports = auditLog;
