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
const errorMiddleware = require("./middlewares/error.middleware");
const morganMiddleware = require("./middlewares/morgan.middleware");

const app = express();

// ─── HTTP Request Logging (Morgan) ─────────────────────────────────────────
app.use(morganMiddleware);

// ─── Security Headers ──────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static file serving (uploaded documents, PDF receipts, and report cards)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running." });
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

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler (must be last) ───────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
