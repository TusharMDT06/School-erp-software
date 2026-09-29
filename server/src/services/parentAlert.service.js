const CallLog = require("../models/CallLog.model");
const voiceCallService = require("./voiceCall.service");
const { isQuietTime } = require("../utils/commsGuard");

/**
 * Formats a date for human-friendly speech/text.
 * @param {Date|string} dateVal
 * @returns {string}
 */
const formatDateStr = (dateVal) => {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Orchestrates multi-channel parent alert (Voice call + fallback to SMS & WhatsApp).
 *
 * @param {Object} params
 * @param {string} params.parentUserId - ObjectId of parent User
 * @param {string} params.parentPhone - Phone number of parent
 * @param {string} params.studentName - Name of student
 * @param {"leave_approved" | "fee_overdue"} params.reason
 * @param {string} params.relatedEntityId - LeaveRequest._id or FeeTransaction._id
 * @param {Object} params.contextData - { fromDate, toDate } OR { amountDue, dueDate }
 * @returns {Promise<import("mongoose").Document|null>}
 */
async function sendParentAlert({
  parentUserId,
  parentPhone,
  studentName = "Student",
  reason,
  relatedEntityId,
  contextData = {},
}) {
  try {
    if (!parentUserId || !parentPhone || !reason || !relatedEntityId) {
      console.warn("⚠️ [ParentAlert] Missing required parameters:", {
        parentUserId,
        parentPhone,
        reason,
        relatedEntityId,
      });
      return null;
    }

    // 1. Prevent duplicate alerts:
    // For fee_overdue, check if alert was sent in the last 3 days
    // For leave_approved, check if alert was ever created for this leave request
    let existingLog;
    if (reason === "fee_overdue") {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      existingLog = await CallLog.findOne({
        reason,
        relatedEntityId,
        createdAt: { $gte: threeDaysAgo },
      });
    } else {
      existingLog = await CallLog.findOne({ reason, relatedEntityId });
    }

    if (existingLog) {
      console.log(
        `ℹ️ [ParentAlert] Skipping duplicate alert for reason='${reason}' and relatedEntityId='${relatedEntityId}'. Existing CallLog: ${existingLog._id}`
      );
      return existingLog;
    }

    // 2. Build the appropriate Hindi voice/text message (Devanagari for Polly.Aditi)
    let message = "";
    if (reason === "leave_approved") {
      const fromDate = formatDateStr(contextData.fromDate);
      const toDate = formatDateStr(contextData.toDate);
      message = `नमस्ते। यह स्कूल ईआरपी से स्वचालित कॉल है। आपके बच्चे ${studentName} का अवकाश ${fromDate} से ${toDate} तक स्वीकृत हो गया है। धन्यवाद।`;
    } else if (reason === "fee_overdue") {
      const amountDue = contextData.amountDue
        ? Number(contextData.amountDue).toLocaleString("en-IN")
        : "कुछ";
      const dueDate = formatDateStr(contextData.dueDate);
      message = `नमस्ते। यह स्कूल ईआरपी से स्वचालित कॉल है। आपके बच्चे ${studentName} की फीस ${amountDue} रुपये ${dueDate} से बकाया है। कृपया जल्द से जल्द भुगतान करें। धन्यवाद।`;
    } else {
      console.warn(`[ParentAlert] Unknown reason: ${reason}`);
      return null;
    }

    console.log(`📣 [ParentAlert] Checking quiet time before alerting ${parentPhone} for student ${studentName}...`);
    const quiet = await isQuietTime(contextData?.schoolId || null, new Date(), "phone");
    if (quiet.isQuiet) {
      console.log(`⏸️ [ParentAlert] Postponing voice/SMS alert to ${parentPhone}: ${quiet.reason}. Next window: ${quiet.nextAllowedTime}`);
      return null;
    }

    console.log(`📣 [ParentAlert] Initiating ${reason} alert to ${parentPhone} for student ${studentName}...`);

    // 3. Initiate the voice call
    // Note: Do not await fallback here. Fallback is handled via Twilio call-status webhook
    // or by the safety-net cron job if the call goes unanswered/busy/fails.
    const callLog = await voiceCallService.makeCall({
      parentUserId,
      parentPhone,
      message,
      reason,
      relatedEntityId,
    });

    return callLog;
  } catch (error) {
    console.error("❌ [ParentAlert Error]:", error.message);
    return null;
  }
}

module.exports = {
  sendParentAlert,
};
