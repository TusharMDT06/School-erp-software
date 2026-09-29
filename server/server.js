require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/config/socket");
const initFeeReminderJob = require("./src/jobs/feeReminder.job");
const { initCallFallbackJob } = require("./src/jobs/callFallbackCheck.job");
const { initFeeOverdueCallJob } = require("./src/jobs/feeOverdueCallCheck.job");
const initFinanceInsightsJob = require("./src/jobs/financeInsights.job");
const { startWelfareCron } = require("./src/jobs/welfareRiskCheck.job");
const { startInquiryCron } = require("./src/jobs/inquiryFollowUpCheck.job");
const { startMonthlyReportCron } = require("./src/jobs/monthlyReportGen.job");
const { startMorningBriefCron } = require("./src/jobs/morningBrief.job");
const { startHomeworkDueReminderCron } = require("./src/jobs/homeworkDueReminderCron.job");
const { startHomeworkDigestCron } = require("./src/jobs/homeworkDigestCron.job");
const { startQuizAutoSubmitCron } = require("./src/jobs/quizAutoSubmitCron.job");
const { startPTMReminderCron } = require("./src/jobs/ptmReminderCron.job");

const PORT = process.env.PORT || 5000;

/**
 * Bootstrap the server:
 * 1. Connect to MongoDB
 * 2. Create HTTP server & bind Socket.io
 * 3. Start automated background cron jobs:
 *    - Daily Fee Email Reminders (09:00 AM)
 *    - Daily Fee Overdue Automated Voice Calls (10:00 AM)
 *    - 10-Minute Call Fallback Safety-Net Check
 *    - Nightly Student Welfare Early-Warning Risk Assessment (02:00 AM)
 *    - Daily Admissions Inquiry Follow-Up Digest (09:00 AM)
 *    - 1st-of-Month Executive MIS Report Generator (07:00 AM)
 *    - Working-Day AI Morning Executive Brief (07:30 AM)
 *    - Homework Due Reminder Cron (05:00 PM)
 *    - Homework Daily Digest Cron (06:00 PM)
 * 4. Start listening on PORT
 */
const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  // Initialize automated background cron jobs
  initFeeReminderJob();
  initFeeOverdueCallJob();
  initCallFallbackJob();
  initFinanceInsightsJob();
  startWelfareCron();
  startInquiryCron();
  startMonthlyReportCron();
  startMorningBriefCron();
  startHomeworkDueReminderCron();
  startHomeworkDigestCron();
  startQuizAutoSubmitCron();
  startPTMReminderCron();

  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("✅ Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // ── Unhandled rejections ───────────────────────────────────────────────
  process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err.message);
    server.close(() => process.exit(1));
  });
};

// Bootstrap application
startServer();
