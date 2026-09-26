const twilioClient = require("../config/twilio");
const { formatPhoneNumber } = require("./sms.service");

/**
 * ============================================================================
 * NOTE ON TWILIO WHATSAPP SANDBOX FOR DEVELOPMENT / TESTING:
 * ----------------------------------------------------------------------------
 * When using the free Twilio WhatsApp Sandbox (e.g., whatsapp:+14155238886),
 * the recipient's phone number must have first opted into the sandbox once
 * by sending a message containing the sandbox join code (for example:
 * "join <sandbox-keyword>") to the Twilio sandbox number (+1 415 523 8886)
 * from their WhatsApp app.
 *
 * This is a one-time Twilio sandbox limitation for development and portfolio
 * demos. In production with an approved WhatsApp Business API profile and number,
 * no pre-joining code is required and messages can be delivered directly.
 * ============================================================================
 */

/**
 * Sends a WhatsApp message using Twilio.
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. +919876543210 or 9876543210)
 * @param {string} params.message - Message body text
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
async function sendWhatsApp({ to, message }) {
  try {
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      throw new Error("Invalid or missing phone number for WhatsApp message");
    }

    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    const response = await twilioClient.messages.create({
      to: `whatsapp:${formattedPhone}`,
      from: fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`,
      body: message,
    });

    console.log(`💬 [Twilio WhatsApp Service] Message sent successfully. SID: ${response.sid} -> whatsapp:${formattedPhone}`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error(`❌ [Twilio WhatsApp Service] Failed to send WhatsApp message to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWhatsApp,
};
