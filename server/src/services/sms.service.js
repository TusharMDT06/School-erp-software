const twilioClient = require("../config/twilio");

/**
 * Formats a phone number for E.164 standard.
 * Prepends "+91" if the number does not already start with "+".
 * Strips whitespace, hyphens, and leading zero.
 * @param {string} phone
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  let cleaned = String(phone).trim().replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = `+91${cleaned.replace(/^0+/, "")}`;
  }

  // Handle dummy seed numbers (e.g. +919988776655, +919988776656).
  // On Twilio Free Trial accounts, calls can only be placed to verified caller IDs.
  // Redirecting dummy numbers ensures tests and demos ring the developer/admin's verified phone.
  const dummyNumbers = ["+919988776655", "+919988776656", "+911234567890", "+910000000000"];
  if (dummyNumbers.includes(cleaned) || cleaned.startsWith("+9199887")) {
    const verifiedPhone = process.env.DEMO_PARENT_PHONE || "+919027805934";
    console.log(`🔀 [PhoneFormat] Mapping dummy seed phone ${cleaned} -> verified trial phone: ${verifiedPhone}`);
    return verifiedPhone;
  }

  return cleaned;
};

/**
 * Sends an SMS message using Twilio.
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS text body
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
async function sendSMS({ to, message }) {
  try {
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      throw new Error("Invalid or missing phone number for SMS");
    }

    const response = await twilioClient.messages.create({
      to: formattedPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: message,
    });

    console.log(`📱 [Twilio SMS Service] SMS sent successfully. SID: ${response.sid} -> ${formattedPhone}`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error(`❌ [Twilio SMS Service] Failed to send SMS to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSMS,
  formatPhoneNumber,
};
