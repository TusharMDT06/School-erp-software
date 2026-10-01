const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const classSectionRoutes = require("./routes/classSection.routes");
const teacherRoutes = require("./routes/teacher.routes");
const studentRoutes = require("./routes/student.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const feeRoutes = require("./routes/fee.routes");
const examRoutes = require("./routes/exam.routes");
const resultRoutes = require("./routes/result.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const schoolRoutes = require("./routes/school.routes");
const aiAssistantRoutes = require("./routes/aiAssistant.routes");
const leaveRequestRoutes = require("./routes/leaveRequest.routes");
const twilioWebhookRoutes = require("./routes/twilioWebhook.routes");
const teacherAttendanceRoutes = require("./routes/teacherAttendance.routes");
const accountantRoutes = require("./routes/accountant.routes");
const concessionRoutes = require("./routes/concession.routes");
const refundRoutes = require("./routes/refund.routes");
const financeSettingsRoutes = require("./routes/financeSettings.routes");
const vendorRoutes = require("./routes/vendor.routes");
const expenseCategoryRoutes = require("./routes/expenseCategory.routes");
const expenseRoutes = require("./routes/expense.routes");
const budgetRoutes = require("./routes/budget.routes");
const ledgerRoutes = require("./routes/ledger.routes");
const cashClosingRoutes = require("./routes/cashClosing.routes");
const salaryStructureRoutes = require("./routes/salaryStructure.routes");
const payrollRoutes = require("./routes/payroll.routes");
const reportRoutes = require("./routes/report.routes");
const reconciliationRoutes = require("./routes/reconciliation.routes");
const razorpayWebhookRoutes = require("./routes/razorpayWebhook.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const calendarRoutes = require("./routes/calendar.routes");
const circularRoutes = require("./routes/circular.routes");
const approvalRoutes = require("./routes/approval.routes");
const principalRoutes = require("./routes/principal.routes");
const academicsRoutes = require("./routes/academics.routes");
const welfareRoutes = require("./routes/welfare.routes");
const staffRoutes = require("./routes/staff.routes");
const substitutionRoutes = require("./routes/substitution.routes");
const incidentRoutes = require("./routes/incident.routes");
const inquiryRoutes = require("./routes/inquiry.routes");
const monthlyReportRoutes = require("./routes/monthlyReport.routes");
const teacherDashboardRoutes = require("./routes/teacherDashboard.routes");
const homeworkRoutes = require("./routes/homework.routes");
const studyMaterialRoutes = require("./routes/studyMaterial.routes");
const studentPortalRoutes = require("./routes/studentPortal.routes");
const parentPortalRoutes = require("./routes/parentPortal.routes");
const syllabusRoutes = require("./routes/syllabus.routes");
const lessonPlanRoutes = require("./routes/lessonPlan.routes");
const gradebookRoutes = require("./routes/gradebook.routes");
const quizRoutes = require("./routes/quiz.routes");
const ptmRoutes = require("./routes/ptm.routes");
const studentRemarkRoutes = require("./routes/studentRemark.routes");
const teacherPortalExtraRoutes = require("./routes/teacherPortalExtra.routes");
const communicationRoutes = require("./routes/communication.routes");
const notificationRoutes = require("./routes/notification.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const morganMiddleware = require("./middlewares/morgan.middleware");

const app = express();

// ─── HTTP Request Logging (Morgan) ─────────────────────────────────────────
app.use(morganMiddleware);

// ─── Trust Reverse Proxy (Render / Heroku load balancers) ─────────────────
app.set("trust proxy", 1);

// ─── Security Headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        allowedOrigins.includes("*") ||
        cleanOrigin.endsWith(".onrender.com") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Public Razorpay Webhook (Raw Body for HMAC SHA256 verification) ─────
app.use(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
    }
    next();
  },
  razorpayWebhookRoutes
);

// ─── Body Parsers ──────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static file serving (uploaded documents, PDF receipts, and report cards)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health & Cache Status Check ───────────────────────────────────────────
const { getCacheHealth } = require("./config/redis");

app.get("/api/health", async (req, res) => {
  const cacheStatus = await getCacheHealth();
  res.status(200).json({
    success: true,
    message: "Server is running.",
    cache: cacheStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/cache", async (req, res) => {
  const cacheStatus = await getCacheHealth();
  res.status(200).json({
    success: true,
    cache: cacheStatus,
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/classes", classSectionRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.use("/api/ai-chat", aiAssistantRoutes);
app.use("/api/leaves", leaveRequestRoutes);
app.use("/api/webhooks/twilio", twilioWebhookRoutes);
app.use("/api/teacher-attendance", teacherAttendanceRoutes);
app.use("/api/accountant", accountantRoutes);
app.use("/api/concessions", concessionRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/finance-settings", financeSettingsRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/cash-closing", cashClosingRoutes);
app.use("/api/salary-structures", salaryStructureRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/circulars", circularRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/principal/academics", academicsRoutes);
app.use("/api/principal/staff", staffRoutes);
app.use("/api/principal/reports", monthlyReportRoutes);
app.use("/api/principal", principalRoutes);
app.use("/api/welfare", welfareRoutes);
app.use("/api/substitutions", substitutionRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api", inquiryRoutes);
app.use("/api/teacher", teacherDashboardRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/study-materials", studyMaterialRoutes);
app.use("/api/student", studentPortalRoutes);
app.use("/api/parent", parentPortalRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/lesson-plans", lessonPlanRoutes);
app.use("/api/gradebook", gradebookRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/ptm", ptmRoutes);
app.use("/api/remarks", studentRemarkRoutes);
app.use("/api/teacher", teacherPortalExtraRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/notifications", notificationRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler (must be last) ───────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
