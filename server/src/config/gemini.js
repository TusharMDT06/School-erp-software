const geminiClient = require("./geminiClient");

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set. AI chat features will be disabled.");
}

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

module.exports = {
  ...geminiClient,
  MODEL_NAME,
};
