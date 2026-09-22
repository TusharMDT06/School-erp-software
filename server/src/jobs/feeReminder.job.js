const cron = require("node-cron");
const sendFeeReminder = require("../utils/sendFeeReminder");

/**
 * Initializes the automated daily fee reminder cron job.
 * Runs every day at 09:00 AM server time.
 */
const initFeeReminderJob = () => {
  // Cron schedule: At 09:00 AM every day
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ [Cron Job] Running automated daily fee reminder...");
    const { sentCount, failedCount } = await sendFeeReminder();
    console.log(
      `✅ [Cron Job] Fee reminders completed: ${sentCount} sent, ${failedCount} failed.`
    );
  });

  console.log("🕒 Fee reminder cron job scheduled (Daily at 09:00 AM).");
};

module.exports = initFeeReminderJob;
