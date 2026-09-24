require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/config/socket");
const initFeeReminderJob = require("./src/jobs/feeReminder.job");

const PORT = process.env.PORT || 5000;

/**
 * Bootstrap the server:
 * 1. Connect to MongoDB
 * 2. Create HTTP server & bind Socket.io
 * 3. Start automated background cron jobs (Fee reminders)
 * 4. Start listening on PORT
 */
const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  // Initialize daily cron jobs
  initFeeReminderJob();

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
