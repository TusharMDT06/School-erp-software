const cron = require("node-cron");
const CallLog = require("../models/CallLog.model");
const { triggerFallbacks } = require("../services/voiceCall.service");

/**
 * Checks for voice calls that are still in "initiated" state after 5+ minutes,
 * indicating that Twilio's terminal status webhook was dropped or delayed.
 * Treats them as failed calls and triggers SMS & WhatsApp fallbacks.
 */
const runCallFallbackCheck = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stalledCalls = await CallLog.find({
      callStatus: "initiated",
      createdAt: { $lt: fiveMinutesAgo },
      smsFallbackSent: false,
    });

    if (stalledCalls.length === 0) {
      return { processedCount: 0 };
    }

    console.log(
      `⏰ [Safety-Net Cron] Found ${stalledCalls.length} stalled initiated call(s) older than 5 minutes. Processing fallbacks...`
    );

    for (const callLog of stalledCalls) {
      callLog.callStatus = "failed"; // Treat unresponsive call as failed
      await callLog.save();
      await triggerFallbacks(callLog);
    }

    console.log(`✅ [Safety-Net Cron] Handled fallbacks for ${stalledCalls.length} stalled calls.`);
    return { processedCount: stalledCalls.length };
  } catch (error) {
    console.error("❌ [Safety-Net Cron Error]:", error.message);
    return { error: error.message };
  }
};

/**
 * Initializes the safety-net cron job running every 10 minutes.
 */
const initCallFallbackJob = () => {
  // Cron schedule: Every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ [Cron Job] Running Call Fallback Safety-Net Check...");
    await runCallFallbackCheck();
  });

  console.log("🕒 Call Fallback Safety-Net cron job scheduled (Every 10 minutes).");
};

module.exports = {
  initCallFallbackJob,
  runCallFallbackCheck,
};
