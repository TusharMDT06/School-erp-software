const cron = require("node-cron");
const School = require("../models/School.model");
const { isWorkingDay } = require("../utils/workingDay");
const {
  computeMorningMetrics,
  generateBriefText,
  BRIEF_CACHE_TTL,
} = require("../controllers/morningBrief.controller");
const { safeSet } = require("../config/redis");
const { notifyMany } = require("../services/notification.service");

/**
 * runMorningBriefJob — Executes daily at 7:30 AM on working days.
 */
async function runMorningBriefJob() {
  console.log("[Cron:MorningBrief] Running 7:30 AM daily AI Morning Brief...");

  try {
    const schools = await School.find({ isActive: true }).lean();
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    for (const school of schools) {
      // 1. Skip non-working days
      const workCheck = await isWorkingDay(school._id, today);
      if (!workCheck.isWorkingDay) {
        console.log(`[Cron:MorningBrief] Skipping ${school.name} (${workCheck.reason}).`);
        continue;
      }

      console.log(`[Cron:MorningBrief] Computing morning brief for ${school.name}...`);

      // 2. Compute Metrics in Code
      const metrics = await computeMorningMetrics(school._id);

      // 3. Generate 6-line brief from Gemini
      const briefText = await generateBriefText(metrics, school.name);

      const payload = {
        brief: briefText,
        figures: metrics,
        date: todayKey,
        generatedAt: new Date(),
      };

      // 4. Cache in Redis for 6 hours
      const cacheKey = `principal:morning_brief:${school._id.toString()}:${todayKey}`;
      await safeSet(cacheKey, JSON.stringify(payload), BRIEF_CACHE_TTL);

      // 5. Email via notify (type: principal_morning_brief)
      await notifyMany(
        {
          schoolId: school._id,
          role: { $in: ["principal", "admin"] },
          isActive: true,
        },
        {
          type: "principal_morning_brief",
          title: `Daily Morning Brief — ${today.toLocaleDateString("en-IN", { dateStyle: "medium" })}`,
          message: briefText,
          data: {
            metrics,
            schoolId: school._id,
          },
          sendEmailFlag: true,
          schoolId: school._id,
        }
      );

      console.log(`[Cron:MorningBrief] Morning brief generated and emailed for ${school.name}.`);
    }
  } catch (err) {
    console.error("[Cron:MorningBrief Error]", err);
  }
}

/**
 * startMorningBriefCron — Schedules daily 7:30 AM job
 */
function startMorningBriefCron() {
  // Cron schedule: 7:30 AM every day
  cron.schedule("30 7 * * *", () => {
    runMorningBriefJob();
  });
  console.log("[Cron] AI Morning Brief scheduled at 07:30 AM daily (working-day aware).");
}

module.exports = { startMorningBriefCron, runMorningBriefJob };
