const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.trim() : "";
const authToken = process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.trim() : "";

let client;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn(
    "⚠️ [Twilio Config] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing. Twilio client initialized in mock/fallback mode."
  );
  client = {
    calls: {
      create: async (options) => {
        console.warn("📞 [Twilio Mock Voice Call]: Credentials not provided. Call payload:", options);
        throw new Error("Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) not configured");
      },
    },
    messages: {
      create: async (options) => {
        console.warn("💬 [Twilio Mock Message]: Credentials not provided. Message payload:", options);
        throw new Error("Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) not configured");
      },
    },
    isMock: true,
  };
}

module.exports = client;
