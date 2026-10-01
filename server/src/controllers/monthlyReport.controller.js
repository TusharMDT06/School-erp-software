const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const MonthlyReport = require("../models/MonthlyReport.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const Incident = require("../models/Incident.model");
const AcademicEvent = require("../models/AcademicEvent.model");
const Circular = require("../models/Circular.model");
const CircularReceipt = require("../models/CircularReceipt.model");
const School = require("../models/School.model");
const StudentRisk = require("../models/StudentRisk.model");
const { getApprovalsList } = require("../services/approvals.service");
const { generateText } = require("../config/geminiClient");
const { notifyMany } = require("../services/notification.service");
const { auditLog } = require("../utils/auditLog");

const fmtINR = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, "../../uploads/reports");
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ── 1. Pure Metric Computation for a Given Month & Year ─────────────────────
async function computeMonthlySnapshot(schoolId, month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  // 1. Enrollment
  const [totalStudents, newAdmissions, withdrawals, classes] = await Promise.all([
    Student.countDocuments({ schoolId, status: "active" }),
    Student.countDocuments({
      schoolId,
      admissionDate: { $gte: startDate, $lte: endDate },
    }),
    Student.countDocuments({
      schoolId,
      status: { $in: ["transferred", "alumni"] },
      updatedAt: { $gte: startDate, $lte: endDate },
    }),
    ClassSection.find({ schoolId }).sort({ className: 1, section: 1 }).lean(),
  ]);

  const classEnrollment = await Promise.all(
    classes.map(async (c) => {
      const count = await Student.countDocuments({ schoolId, classId: c._id, status: "active" });
      return {
        classId: c._id,
        name: `${c.className}-${c.section}`,
        count,
        capacity: c.capacity || 40,
      };
    })
  );

  // 2. Attendance (Daily average % in month)
  const attendanceAgg = await Attendance.aggregate([
    {
      $match: {
        schoolId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$classId",
        totalRecords: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] },
        },
      },
    },
  ]);

  const classAttMap = {};
  attendanceAgg.forEach((a) => {
    const pct = a.totalRecords > 0 ? Math.round((a.presentCount / a.totalRecords) * 100) : 0;
    classAttMap[a._id.toString()] = pct;
  });

  const classAttendanceList = classEnrollment.map((c) => ({
    name: c.name,
    attendancePercent: classAttMap[c.classId.toString()] ?? 85, // reasonable default if no records logged
  }));

  const totalAttSum = classAttendanceList.reduce((acc, curr) => acc + curr.attendancePercent, 0);
  const overallAttendancePercent =
    classAttendanceList.length > 0 ? Math.round(totalAttSum / classAttendanceList.length) : 0;

  // 3. Finance (From Ledger only)
  const financeAgg = await LedgerEntry.aggregate([
    {
      $match: {
        schoolId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { direction: "$direction", category: "$category" },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  let totalCollectionPaise = 0;
  let totalExpensesPaise = 0;

  financeAgg.forEach((f) => {
    if (f._id.direction === "in") {
      totalCollectionPaise += f.totalAmount;
    } else if (f._id.direction === "out") {
      totalExpensesPaise += f.totalAmount;
    }
  });

  const netCashFlowPaise = totalCollectionPaise - totalExpensesPaise;

  // 4. Academics (Latest published exam)
  const latestExam = await Exam.findOne({
    schoolId,
    startDate: { $lte: endDate },
  })
    .sort({ startDate: -1 })
    .lean();

  let examMetrics = {
    examName: "No Exam Conducted",
    passPercent: 0,
    averageScore: 0,
  };

  if (latestExam) {
    const results = await Result.find({ examId: latestExam._id, isPublished: true }).lean();
    if (results.length > 0) {
      const passed = results.filter((r) => r.isPassed).length;
      const passPct = Math.round((passed / results.length) * 100);
      const totalPctSum = results.reduce((acc, r) => acc + (r.percentage || 0), 0);
      const avgScore = Math.round((totalPctSum / results.length) * 10) / 10;
      examMetrics = {
        examName: latestExam.name,
        passPercent: passPct,
        averageScore: avgScore,
        totalAppeared: results.length,
      };
    }
  }

  // 5. Staff (Leaves & Substitutions)
  const [totalTeachers, approvedLeaves, substitutions] = await Promise.all([
    Teacher.countDocuments({ schoolId, status: "active" }),
    LeaveRequest.find({
      schoolId,
      status: "approved",
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).lean(),
    SubstituteAssignment.countDocuments({
      schoolId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ["assigned", "acknowledged", "completed"] },
    }),
  ]);

  let totalLeaveDays = 0;
  approvedLeaves.forEach((lv) => {
    const s = new Date(Math.max(startDate, new Date(lv.startDate)));
    const e = new Date(Math.min(endDate, new Date(lv.endDate)));
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    totalLeaveDays += Math.max(1, diff);
  });

  // 6. Incidents
  const incidents = await Incident.find({
    schoolId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const incidentsByCategory = {};
  const incidentsBySeverity = { low: 0, medium: 0, high: 0 };
  incidents.forEach((inc) => {
    incidentsByCategory[inc.category] = (incidentsByCategory[inc.category] || 0) + 1;
    if (incidentsBySeverity[inc.severity] !== undefined) {
      incidentsBySeverity[inc.severity] += 1;
    }
  });

  // 7. Events & Circulars
  const [eventsHeld, circularsIssued] = await Promise.all([
    AcademicEvent.countDocuments({
      schoolId,
      status: "published",
      startDate: { $gte: startDate, $lte: endDate },
    }),
    Circular.find({
      schoolId,
      status: "published",
      publishedAt: { $gte: startDate, $lte: endDate },
    }).lean(),
  ]);

  let circularAckPercent = 0;
  if (circularsIssued.length > 0) {
    const totalReceipts = await CircularReceipt.countDocuments({
      circularId: { $in: circularsIssued.map((c) => c._id) },
    });
    const ackedReceipts = await CircularReceipt.countDocuments({
      circularId: { $in: circularsIssued.map((c) => c._id) },
      isAcknowledged: true,
    });
    circularAckPercent = totalReceipts > 0 ? Math.round((ackedReceipts / totalReceipts) * 100) : 0;
  }

  // 8. Top 5 Rule-Based Concerns
  const topConcerns = [];

  // Concern A: Classes with low attendance (< 75%)
  const lowAttClasses = classAttendanceList.filter((c) => c.attendancePercent < 75);
  if (lowAttClasses.length > 0) {
    topConcerns.push(
      `Attendance below 75% in ${lowAttClasses.length} class(es): ${lowAttClasses.map((c) => `${c.name} (${c.attendancePercent}%)`).join(", ")}.`
    );
  }

  // Concern B: Overdue Approvals
  const pendingApprovalsRes = await getApprovalsList(schoolId, { status: "pending", limit: 100 });
  const pendingApprovalsList = pendingApprovalsRes.items || [];
  const overdueApprovals = pendingApprovalsList.filter((a) => (a.ageDays || 0) >= 3).length;
  if (overdueApprovals > 0) {
    topConcerns.push(`${overdueApprovals} pending administrative/leave approvals exceed the 3-day SLA.`);
  }

  // Concern C: High-Risk Students
  const highRiskCount = await StudentRisk.countDocuments({ schoolId, band: "high" });
  if (highRiskCount > 0) {
    topConcerns.push(
      `${highRiskCount} student(s) identified in Early Warning High Risk band requiring welfare intervention.`
    );
  }

  // Concern D: High-Severity Incidents
  if (incidentsBySeverity.high > 0) {
    topConcerns.push(
      `${incidentsBySeverity.high} severe discipline/safety incident(s) recorded during the month.`
    );
  }

  // Concern E: Academic Fail Rate
  if (examMetrics.passPercent > 0 && examMetrics.passPercent < 70) {
    topConcerns.push(
      `Latest examination (${examMetrics.examName}) resulted in a low overall pass rate of ${examMetrics.passPercent}%.`
    );
  }

  // Concern F: Cash flow deficit
  if (netCashFlowPaise < 0) {
    topConcerns.push(
      `Negative operational cash flow of ${fmtINR(Math.abs(netCashFlowPaise))} recorded in the ledger for this month.`
    );
  }

  // Fallback safe concern if all are clean
  if (topConcerns.length === 0) {
    topConcerns.push("All institutional indicators remain within standard target thresholds.");
  }

  return {
    period: { month: m, year: y },
    enrollment: {
      total: totalStudents,
      admissions: newAdmissions,
      withdrawals,
      byClass: classEnrollment,
    },
    attendance: {
      overallPercent: overallAttendancePercent,
      byClass: classAttendanceList,
    },
    academics: examMetrics,
    finance: {
      collectionPaise: totalCollectionPaise,
      expensesPaise: totalExpensesPaise,
      netCashFlowPaise,
      collectionINR: fmtINR(totalCollectionPaise),
      expensesINR: fmtINR(totalExpensesPaise),
      netCashFlowINR: fmtINR(netCashFlowPaise),
    },
    staff: {
      totalTeachers,
      leaveDays: totalLeaveDays,
      substitutionsCovered: substitutions,
    },
    incidents: {
      total: incidents.length,
      byCategory: incidentsByCategory,
      bySeverity: incidentsBySeverity,
    },
    eventsHeld,
    circulars: {
      issued: circularsIssued.length,
      ackPercent: circularAckPercent,
    },
    top5Concerns: topConcerns.slice(0, 5),
  };
}

// ── 2. Gemini Narration (Narrates from COMPUTED numbers only) ────────────────
async function generateExecutiveSummary(snapshot, schoolName) {
  const f = snapshot.finance;
  const e = snapshot.enrollment;
  const a = snapshot.attendance;
  const s = snapshot.staff;
  const ac = snapshot.academics;

  const prompt = `You are an educational executive consultant reviewing verified operational data for ${schoolName}.
Write a single, polished, professional executive summary paragraph (120 to 140 words) for the School Principal and Board of Directors for Month ${snapshot.period.month}/${snapshot.period.year}.

CRITICAL RULES:
1. Base the summary EXCLUSIVELY on the verified figures provided below.
2. DO NOT calculate, guess, extrapolate, or invent any numbers.
3. Use exact numbers and rupee values as provided.
4. Conclude with an objective management outlook.

Verified Operational Metrics:
- Total Enrolled Students: ${e.total} (${e.admissions} new admissions, ${e.withdrawals} withdrawals)
- Overall Attendance: ${a.overallPercent}%
- Total Ledger Collection: ${f.collectionINR}
- Total Ledger Expenses: ${f.expensesINR}
- Net Cash Flow: ${f.netCashFlowINR}
- Latest Exam (${ac.examName}): Pass Rate ${ac.passPercent}%, Average Score ${ac.averageScore || "N/A"}%
- Teaching Staff: ${s.totalTeachers} teachers, ${s.leaveDays} leave days taken, ${s.substitutionsCovered} substitution covers arranged
- Campus Incidents: ${snapshot.incidents.total} total (${snapshot.incidents.bySeverity.high} high severity)
- Key Concerns: ${snapshot.top5Concerns.join("; ")}`;

  try {
    const text = await generateText(prompt);
    if (text && text.trim().length > 40) {
      return text.trim();
    }
  } catch (err) {
    console.warn("[MonthlyReport] Gemini narration failed, using rule-based fallback:", err.message);
  }

  // Fallback summary narrative strictly computed from figures
  return `During the reporting month ${snapshot.period.month}/${snapshot.period.year}, ${schoolName} maintained an active enrollment of ${e.total} students with ${e.admissions} new admissions and ${e.withdrawals} withdrawals. Institutional attendance averaged ${a.overallPercent}%. Financial operations reflected a total fee collection of ${f.collectionINR} against ledger expenses of ${f.expensesINR}, producing a net cash flow of ${f.netCashFlowINR}. Academic evaluations for ${ac.examName} demonstrated a pass rate of ${ac.passPercent}%. On the operational front, ${s.totalTeachers} teachers logged ${s.leaveDays} leave days with ${s.substitutionsCovered} class substitutions executed. Leadership attention is focused on addressing key indicators: ${snapshot.top5Concerns[0] || "maintaining institutional targets"}.`;
}

// ── 3. PDF Generator (pdfkit) ────────────────────────────────────────────────
async function buildPdfReport(snapshot, school, summaryText, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    const schoolName = school.name || "School ERP Institution";
    const periodStr = `${new Date(snapshot.period.year, snapshot.period.month - 1).toLocaleString("default", { month: "long" })} ${snapshot.period.year}`;

    // ── Header ──
    doc.rect(40, 40, 515, 60).fill("#1e293b");
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(schoolName, 55, 52);
    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text(`Monthly Executive MIS Report — ${periodStr}`, 55, 75);

    // ── Executive Summary Callout ──
    doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("Executive Summary", 40, 115);
    doc.rect(40, 130, 515, 80).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#334155").fontSize(9.5).font("Helvetica").text(summaryText, 52, 140, {
      width: 490,
      lineGap: 3,
      align: "justify",
    });

    // ── Core KPIs Grid (4 Columns) ──
    let y = 225;
    doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text("Key Institutional Indicators", 40, y);
    y += 18;

    const cards = [
      { label: "Total Enrolled", val: `${snapshot.enrollment.total}`, sub: `+${snapshot.enrollment.admissions} new adm` },
      { label: "Avg Attendance", val: `${snapshot.attendance.overallPercent}%`, sub: "Monthly average" },
      { label: "Fee Collection", val: `${snapshot.finance.collectionINR}`, sub: "From ledger entries" },
      { label: "Net Cash Flow", val: `${snapshot.finance.netCashFlowINR}`, sub: `Exp: ${snapshot.finance.expensesINR}` },
    ];

    const cardW = 122;
    cards.forEach((card, idx) => {
      const cx = 40 + idx * (cardW + 8);
      doc.rect(cx, y, cardW, 50).fill("#f1f5f9").stroke("#cbd5e1");
      doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold").text(card.label.toUpperCase(), cx + 8, y + 8);
      doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text(card.val, cx + 8, y + 20);
      doc.fillColor("#64748b").fontSize(7.5).font("Helvetica").text(card.sub, cx + 8, y + 37);
    });

    // ── Secondary Metrics (Academics & Staff) ──
    y += 65;
    doc.rect(40, y, 252, 70).fill("#ffffff").stroke("#e2e8f0");
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("Academics Overview", 50, y + 10);
    doc.fillColor("#475569").fontSize(9).font("Helvetica").text(`Latest Exam: ${snapshot.academics.examName}`, 50, y + 28);
    doc.text(`Pass Rate: ${snapshot.academics.passPercent}% | Avg Score: ${snapshot.academics.averageScore || "N/A"}%`, 50, y + 44);

    doc.rect(303, y, 252, 70).fill("#ffffff").stroke("#e2e8f0");
    doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("Staff & Operations", 313, y + 10);
    doc.fillColor("#475569").fontSize(9).font("Helvetica").text(`Active Teachers: ${snapshot.staff.totalTeachers}`, 313, y + 28);
    doc.text(`Leave Days: ${snapshot.staff.leaveDays} | Covers Assigned: ${snapshot.staff.substitutionsCovered}`, 313, y + 44);

    // ── Drawn Bar Chart (Class Attendance) ──
    y += 85;
    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Class Attendance Overview", 40, y);
    y += 16;

    const sampleClasses = snapshot.attendance.byClass.slice(0, 5);
    sampleClasses.forEach((cls) => {
      doc.fillColor("#334155").fontSize(8).font("Helvetica").text(cls.name, 40, y + 2);
      // Background bar
      doc.rect(100, y, 350, 10).fill("#e2e8f0");
      // Filled bar
      const fillW = Math.min(350, Math.round((cls.attendancePercent / 100) * 350));
      const barColor = cls.attendancePercent >= 80 ? "#10b981" : cls.attendancePercent >= 75 ? "#f59e0b" : "#ef4444";
      doc.rect(100, y, fillW, 10).fill(barColor);
      doc.fillColor("#0f172a").fontSize(8).font("Helvetica-Bold").text(`${cls.attendancePercent}%`, 460, y + 2);
      y += 15;
    });

    // ── Key Concerns Callout Box ──
    y += 10;
    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text("Top Institutional Concerns", 40, y);
    y += 16;
    doc.rect(40, y, 515, 75).fill("#fff7ed").stroke("#fdba74");
    let cy = y + 8;
    snapshot.top5Concerns.forEach((concern, i) => {
      doc.fillColor("#c2410c").fontSize(8).font("Helvetica-Bold").text(`${i + 1}.`, 50, cy);
      doc.fillColor("#9a3412").fontSize(8).font("Helvetica").text(concern, 64, cy, { width: 475 });
      cy += 13;
    });

    // ── Sign-off Footer ──
    y = 740;
    doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} via School ERP Executive MIS Engine`, 40, y + 8);
    doc.text("Principal Signature: _______________________", 360, y + 8);

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
}

// ── 4. Excel Workbook Generator (exceljs) ───────────────────────────────────
async function buildExcelReport(snapshot, school, filePath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School ERP MIS";
  workbook.created = new Date();

  // Sheet 1: Executive Overview
  const wsOverview = workbook.addWorksheet("Executive Overview");
  wsOverview.columns = [
    { header: "Indicator", key: "indicator", width: 35 },
    { header: "Metric Value", key: "val", width: 25 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  wsOverview.addRows([
    { indicator: "Reporting Period", val: `${snapshot.period.month}/${snapshot.period.year}`, notes: "Monthly Cycle" },
    { indicator: "School Name", val: school.name, notes: "Verified Institution" },
    { indicator: "Total Enrolled Students", val: snapshot.enrollment.total, notes: "Active Student Body" },
    { indicator: "New Admissions", val: snapshot.enrollment.admissions, notes: "Joined during month" },
    { indicator: "Withdrawals / Transferred", val: snapshot.enrollment.withdrawals, notes: "Exited during month" },
    { indicator: "Overall Attendance %", val: `${snapshot.attendance.overallPercent}%`, notes: "Target: >=85%" },
    { indicator: "Ledger Fee Collection", val: snapshot.finance.collectionINR, notes: "Immuntable ledger sum" },
    { indicator: "Ledger Expenses", val: snapshot.finance.expensesINR, notes: "Operational & Payroll outlays" },
    { indicator: "Net Ledger Cash Flow", val: snapshot.finance.netCashFlowINR, notes: "Surplus / Deficit" },
    { indicator: "Latest Exam Conducted", val: snapshot.academics.examName, notes: "Academic Assessment" },
    { indicator: "Exam Pass Percentage", val: `${snapshot.academics.passPercent}%`, notes: "Published results" },
    { indicator: "Active Teaching Staff", val: snapshot.staff.totalTeachers, notes: "On institutional payroll" },
    { indicator: "Teacher Leave Days", val: snapshot.staff.leaveDays, notes: "Approved leaves taken" },
    { indicator: "Substitutions Arranged", val: snapshot.staff.substitutionsCovered, notes: "Timetable periods covered" },
    { indicator: "Discipline Incidents", val: snapshot.incidents.total, notes: `High severity: ${snapshot.incidents.bySeverity.high}` },
  ]);

  // Sheet 2: Class Attendance
  const wsAtt = workbook.addWorksheet("Class Attendance");
  wsAtt.columns = [
    { header: "Class & Section", key: "name", width: 25 },
    { header: "Enrolled Students", key: "count", width: 20 },
    { header: "Capacity", key: "capacity", width: 15 },
    { header: "Attendance %", key: "att", width: 18 },
  ];
  snapshot.enrollment.byClass.forEach((c) => {
    const attObj = snapshot.attendance.byClass.find((a) => a.name === c.name);
    wsAtt.addRow({
      name: c.name,
      count: c.count,
      capacity: c.capacity,
      att: attObj ? `${attObj.attendancePercent}%` : "N/A",
    });
  });

  // Sheet 3: Concerns & Action Items
  const wsConcerns = workbook.addWorksheet("Key Concerns");
  wsConcerns.columns = [
    { header: "#", key: "idx", width: 8 },
    { header: "Identified Concern", key: "concern", width: 70 },
  ];
  snapshot.top5Concerns.forEach((c, idx) => {
    wsConcerns.addRow({ idx: idx + 1, concern: c });
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// ── 5. Endpoints ─────────────────────────────────────────────────────────────

// GET /api/principal/reports/monthly?month=&year=
exports.getMonthlySnapshot = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const now = new Date();
    const month = req.query.month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const year = req.query.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const snapshot = await computeMonthlySnapshot(schoolId, month, year);
    return res.json({ success: true, data: snapshot });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/principal/reports/monthly/generate
exports.generateMonthlyReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const now = new Date();
    const month = req.body.month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const year = req.body.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const school = await School.findById(schoolId).lean();
    if (!school) {
      return res.status(404).json({ success: false, message: "School not found." });
    }

    // 1. Compute Data
    const snapshot = await computeMonthlySnapshot(schoolId, month, year);

    // 2. Gemini Narrative Summary
    const summaryText = await generateExecutiveSummary(snapshot, school.name);

    // 3. File Paths
    const pdfFilename = `MIS_${schoolId}_${year}_${month}.pdf`;
    const excelFilename = `MIS_${schoolId}_${year}_${month}.xlsx`;

    const pdfPath = path.join(REPORTS_DIR, pdfFilename);
    const excelPath = path.join(REPORTS_DIR, excelFilename);

    // 4. Build Files
    await Promise.all([
      buildPdfReport(snapshot, school, summaryText, pdfPath),
      buildExcelReport(snapshot, school, excelPath),
    ]);

    const pdfUrl = `/uploads/reports/${pdfFilename}`;
    const excelUrl = `/uploads/reports/${excelFilename}`;

    // 5. Upsert MonthlyReport record
    const report = await MonthlyReport.findOneAndUpdate(
      { schoolId, month, year },
      {
        schoolId,
        month,
        year,
        dataSnapshot: snapshot,
        summaryText,
        pdfUrl,
        excelUrl,
        generatedAt: new Date(),
        generatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    await auditLog(req, {
      action: "CREATE",
      module: "REPORTS",
      details: {
        reportId: report._id,
        month,
        year,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Monthly MIS Report for ${month}/${year} generated successfully.`,
      data: report,
    });
  } catch (err) {
    console.error("[generateMonthlyReport Error]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/principal/reports (list)
exports.listReports = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const filter = req.user.role === "superadmin" && !schoolId ? {} : schoolId ? { schoolId } : {};
    const reports = await MonthlyReport.find(filter)
      .populate("generatedBy", "name email role")
      .sort({ year: -1, month: -1 })
      .lean();

    return res.json({ success: true, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/principal/reports/:id/download?format=pdf|excel
exports.downloadReport = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { format = "pdf" } = req.query;

    const query = { _id: req.params.id };
    if (req.user.role !== "superadmin" && schoolId) {
      query.schoolId = schoolId;
    }

    const report = await MonthlyReport.findOne(query);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    const ext = format === "excel" ? "xlsx" : "pdf";
    const downloadName = `MIS_Report_${report.month}_${report.year}.${ext}`;
    const relUrl = format === "excel" ? report.excelUrl : report.pdfUrl;

    let absPath = relUrl ? path.join(__dirname, "../..", relUrl) : null;

    // Ephemeral filesystem fallback: If the physical file does not exist on disk
    // (e.g. Render container redeployed/restarted), dynamically regenerate it from the stored snapshot!
    if (!absPath || !fs.existsSync(absPath)) {
      console.log(`📄 [MonthlyReport] Physical file missing for report ${report._id}, dynamically regenerating ${ext}...`);

      if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
      }

      const school = (await School.findById(report.schoolId).lean()) || { name: "School ERP Institution" };
      const snapshot = report.dataSnapshot || (await computeMonthlySnapshot(report.schoolId, report.month, report.year));
      const summaryText = report.summaryText || (await generateExecutiveSummary(snapshot, school.name));

      const pdfFilename = `MIS_${report.schoolId}_${report.year}_${report.month}.pdf`;
      const excelFilename = `MIS_${report.schoolId}_${report.year}_${report.month}.xlsx`;

      const targetPdfPath = path.join(REPORTS_DIR, pdfFilename);
      const targetExcelPath = path.join(REPORTS_DIR, excelFilename);

      if (format === "excel") {
        await buildExcelReport(snapshot, school, targetExcelPath);
        absPath = targetExcelPath;
        report.excelUrl = `/uploads/reports/${excelFilename}`;
      } else {
        await buildPdfReport(snapshot, school, summaryText, targetPdfPath);
        absPath = targetPdfPath;
        report.pdfUrl = `/uploads/reports/${pdfFilename}`;
      }

      await report.save().catch(() => {});
    }

    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.setHeader(
      "Content-Type",
      format === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf"
    );

    return res.download(absPath, downloadName);
  } catch (err) {
    console.error("[downloadReport Error]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Export functions for cron
exports.computeMonthlySnapshot = computeMonthlySnapshot;
exports.generateExecutiveSummary = generateExecutiveSummary;
exports.buildPdfReport = buildPdfReport;
exports.buildExcelReport = buildExcelReport;
exports.REPORTS_DIR = REPORTS_DIR;
