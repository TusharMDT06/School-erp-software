const express = require("express");
const router = express.Router();
const twilio = require("twilio");
const CallLog = require("../models/CallLog.model");
const { triggerFallbacks } = require("../services/voiceCall.service");

/**
 * Validates whether incoming request originated from Twilio.
 * In development or when credentials are not configured, logs a warning and permits the request.
 */
const validateTwilioSignature = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioSignature = req.headers["x-twilio-signature"];

  // If in non-production or if auth token is not configured, bypass verification
  if (!authToken || process.env.NODE_ENV !== "production") {
    return next();
  }

  if (!twilioSignature) {
    console.warn("⚠️ [Twilio Webhook] Missing 'x-twilio-signature' header. Request rejected.");
    return res.status(403).json({ success: false, message: "Missing Twilio signature." });
  }

  // Construct full public URL requested by Twilio
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, twilioSignature, fullUrl, req.body);

  if (!isValid) {
    console.warn("⚠️ [Twilio Webhook] Invalid Twilio request signature.");
    return res.status(403).json({ success: false, message: "Invalid Twilio signature." });
  }

  next();
};

/**
 * POST /api/webhooks/twilio/call-status
 * Status callback from Twilio when a voice call reaches a terminal state.
 * Events: completed, no-answer, busy, failed
 */
router.post("/call-status", validateTwilioSignature, async (req, res) => {
  // Respond quickly to Twilio to prevent webhook timeouts
  res.status(200).type("text/xml").send("<Response/>");

  try {
    const { CallSid, CallStatus } = req.body;
    console.log(`📡 [Twilio Webhook] Received call status update: SID=${CallSid}, Status=${CallStatus}`);

    if (!CallSid) {
      console.warn("⚠️ [Twilio Webhook] CallSid missing in request body.");
      return;
    }

    const callLog = await CallLog.findOne({ twilioCallSid: CallSid });
    if (!callLog) {
      console.warn(`⚠️ [Twilio Webhook] No CallLog record found for CallSid: ${CallSid}`);
      return;
    }

    // Normalize Twilio status values
    let normalizedStatus = CallStatus?.toLowerCase();
    if (!["completed", "no-answer", "busy", "failed"].includes(normalizedStatus)) {
      normalizedStatus = "failed";
    }

    callLog.callStatus = normalizedStatus;
    await callLog.save();

    console.log(`📝 [Twilio Webhook] Updated CallLog ${callLog._id} status to '${normalizedStatus}'`);

    // If call was not answered or failed, execute SMS + WhatsApp fallback
    if (["no-answer", "busy", "failed"].includes(normalizedStatus)) {
      // Trigger fallback only if not already sent
      if (!callLog.smsFallbackSent && !callLog.whatsappFallbackSent) {
        console.log(`⚡ [Twilio Webhook] Call was ${normalizedStatus}. Triggering SMS & WhatsApp fallbacks...`);
        await triggerFallbacks(callLog);
      }
    } else if (normalizedStatus === "completed") {
      console.log(`✅ [Twilio Webhook] Call completed successfully. No fallback needed for CallLog ${callLog._id}.`);
    }
  } catch (error) {
    console.error("❌ [Twilio Webhook Error]:", error.message);
  }
});

module.exports = router;
