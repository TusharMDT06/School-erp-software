const cron = require("node-cron");
const School = require("../models/School.model");
const { getWeeklyFinanceInsight } = require("../services/financeInsights.service");

/**
 * Initializes the weekly financial insight cron job.
 * Runs every Monday at 8:00 AM (0 8 * * 1).
 */
const initFinanceInsightsJob = () => {
  cron.schedule("0 8 * * 1", async () => {
    console.log("[Cron] Running Weekly Finance Insights Job (Monday 8:00 AM)...");
    try {
      const activeSchools = await School.find({ isActive: true }).select("_id name").lean();

      for (const school of activeSchools) {
        try {
          await getWeeklyFinanceInsight(school._id, true);
          console.log(`[Cron] Generated weekly finance insight for ${school.name}`);
        } catch (schoolErr) {
          console.error(
            `[Cron] Failed insight generation for school ${school.name}:`,
            schoolErr.message
          );
        }
      }
    } catch (err) {
      console.error("[Cron] Weekly finance insights job failed:", err.message);
    }
  });

  console.log("⏰ Weekly Finance Insights cron job registered (Every Monday at 8:00 AM).");
};

module.exports = initFinanceInsightsJob;
