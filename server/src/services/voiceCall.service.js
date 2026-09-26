const twilioClient = require("../config/twilio");
const CallLog = require("../models/CallLog.model");
const { sendSMS, formatPhoneNumber } = require("./sms.service");
const { sendWhatsApp } = require("./whatsapp.service");

/**
 * Triggers both SMS and WhatsApp fallback messages independently.
 * Updates the CallLog record with status and SIDs.
 * @param {import("mongoose").Document} callLog
 * @returns {Promise<import("mongoose").Document>}
 */
async function triggerFallbacks(callLog) {
  try {
    console.log(`⚡ [Fallback Triggered] Executing SMS & WhatsApp fallback for CallLog: ${callLog._id}`);

    const [smsRes, waRes] = await Promise.allSettled([
      sendSMS({ to: callLog.recipientPhone, message: callLog.message }),
      sendWhatsApp({ to: callLog.recipientPhone, message: callLog.message }),
    ]);

    const sms = smsRes.status === "fulfilled" ? smsRes.value : { success: false, error: smsRes.reason?.message };
    const wa = waRes.status === "fulfilled" ? waRes.value : { success: false, error: waRes.reason?.message };

    callLog.smsFallbackSent = true;
    callLog.smsFallbackSid = sms.sid || null;
    callLog.smsFallbackStatus = sms.success ? "sent" : "failed";

    callLog.whatsappFallbackSent = true;
    callLog.whatsappFallbackSid = wa.sid || null;
    callLog.whatsappFallbackStatus = wa.success ? "sent" : "failed";

    await callLog.save();
    console.log(`✅ [Fallback Completed] SMS: ${callLog.smsFallbackStatus}, WhatsApp: ${callLog.whatsappFallbackStatus}`);
    return callLog;
  } catch (err) {
    console.error(`❌ [Fallback Error] Error triggering fallbacks for CallLog ${callLog._id}:`, err.message);
    return callLog;
  }
}

/**
 * Initiates an automated Hindi voice call to a parent using Twilio Voice.
 * If initiation fails, creates CallLog with status 'failed' and triggers immediate fallback.
 *
 * @param {Object} params
 * @param {string} params.parentUserId
 * @param {string} params.parentPhone
 * @param {string} params.message
 * @param {string} params.reason - "leave_approved" | "fee_overdue"
 * @param {string} params.relatedEntityId
 * @returns {Promise<import("mongoose").Document>}
 */
async function makeCall({ parentUserId, parentPhone, message, reason, relatedEntityId }) {
  const formattedPhone = formatPhoneNumber(parentPhone);

  if (!formattedPhone) {
    console.warn(`[VoiceCall] Invalid or missing phone number: "${parentPhone}" for parentUserId: ${parentUserId}`);
    const failedLog = await CallLog.create({
      recipientUserId: parentUserId,
      recipientPhone: parentPhone || "UNKNOWN",
      reason,
      relatedEntityId,
      message,
      callStatus: "failed",
    });
    return failedLog;
  }

  const serverUrl = (process.env.SERVER_URL || "").replace(/\/$/, "");
  const statusCallbackUrl = serverUrl
    ? `${serverUrl}/api/webhooks/twilio/call-status`
    : undefined;

  // Escape special XML characters for valid TwiML
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  try {
    const callOptions = {
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `<Response><Say voice="Polly.Aditi" language="hi-IN">${safeMessage}</Say></Response>`,
      statusCallbackEvent: ["completed", "no-answer", "busy", "failed"],
    };

    if (statusCallbackUrl) {
      callOptions.statusCallback = statusCallbackUrl;
    }

    const call = await twilioClient.calls.create(callOptions);

    console.log(`📞 [Twilio Voice Call] Initiated successfully. Call SID: ${call.sid} -> ${formattedPhone}`);

    const callLog = await CallLog.create({
      recipientUserId: parentUserId,
      recipientPhone: formattedPhone,
      reason,
      relatedEntityId,
      message,
      callStatus: "initiated",
      twilioCallSid: call.sid,
    });

    return callLog;
  } catch (error) {
    console.error(`❌ [Twilio Voice Call Initiation Failed] to ${formattedPhone}:`, error.message);

    // Save CallLog as 'failed' and IMMEDIATELY trigger SMS + WhatsApp fallback
    const callLog = await CallLog.create({
      recipientUserId: parentUserId,
      recipientPhone: formattedPhone,
      reason,
      relatedEntityId,
      message,
      callStatus: "failed",
      twilioCallSid: null,
    });

    // Execute fallback right away
    await triggerFallbacks(callLog);

    return callLog;
  }
}

module.exports = {
  makeCall,
  triggerFallbacks,
};
