const { adminToolDeclarations, adminToolHandlers } = require("./adminTools");
const StudentRisk = require("../../models/StudentRisk.model");
const Student = require("../../models/Student.model");
const Timetable = require("../../models/Timetable.model");
const Teacher = require("../../models/Teacher.model");
const Attendance = require("../../models/Attendance.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");
const ClassSection = require("../../models/ClassSection.model");
const AdmissionInquiry = require("../../models/AdmissionInquiry.model");
const AcademicEvent = require("../../models/AcademicEvent.model");
const { getApprovalCounts, getApprovalsList } = require("../approvals.service");

// ── Additional Principal Tool Declarations (Read-Only) ───────────────────────
const principalSpecificDeclarations = [
  {
    name: "get_at_risk_students",
    description: "Get early-warning students flagged with academic or welfare risk. Returns risk scores, bands, and observations. Can filter by risk band (high, medium, low) or class.",
    parameters: {
      type: "OBJECT",
      properties: {
        band: { type: "STRING", description: "Optional band filter: 'high', 'medium', or 'low'" },
        classId: { type: "STRING", description: "Optional Class Section ID to filter" },
      },
      required: [],
    },
  },
  {
    name: "get_approval_backlog",
    description: "Get an executive summary of pending institutional approvals (leave, fee concessions, refunds, expenses, payroll) including backlog volume and oldest SLA age.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_staff_compliance_summary",
    description: "Get teaching staff overview including assigned periods, leave usage, and operational compliance (attendance-marking promptness before cutoff). Strictly for review, not ranking.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_results_trend",
    description: "Get multi-exam academic performance trajectory and class average trajectory in chronological order. Optionally filter by classId.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Optional Class Section ID to analyze trend" },
      },
      required: [],
    },
  },
  {
    name: "get_admission_funnel",
    description: "Get prospective admission inquiry funnel metrics: lead stages, stage-to-stage conversion rates, and available seats per class.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_upcoming_events",
    description: "Get upcoming calendar events, exams, holidays, and meetings scheduled on the academic calendar for the next N days.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "NUMBER", description: "Number of upcoming days to inspect (default 7)" },
      },
      required: [],
    },
  },
];

const principalToolDeclarations = [...adminToolDeclarations, ...principalSpecificDeclarations];

// ── Additional Principal Tool Handlers (Strictly Read-Only) ─────────────────
const principalSpecificHandlers = {
  get_at_risk_students: async ({ schoolId, band, classId }) => {
    const query = { schoolId };
    if (band && ["low", "medium", "high"].includes(band.toLowerCase())) {
      query.band = band.toLowerCase();
    }
    if (classId) {
      query.classId = classId;
    }

    const items = await StudentRisk.find(query)
      .populate("studentId", "firstName lastName admissionNumber rollNumber")
      .populate("classId", "className section")
      .sort({ score: -1 })
      .limit(20)
      .lean();

    return items.map((r) => ({
      studentName: `${r.studentId?.firstName || ""} ${r.studentId?.lastName || ""}`.trim() || "Student",
      admissionNumber: r.studentId?.admissionNumber,
      class: r.classId ? `${r.classId.className}-${r.classId.section}` : "N/A",
      riskScore: r.score,
      riskBand: r.band.toUpperCase(),
      reasons: (r.reasons || [])
        .filter((f) => f.visibility !== "finance")
        .map((f) => `${f.factor}: ${f.detail}`),
    }));
  },

  get_approval_backlog: async ({ schoolId }) => {
    const counts = await getApprovalCounts(schoolId);
    const pendingRes = await getApprovalsList(schoolId, { type: "all", status: "pending", limit: 20 });
    const pendingList = pendingRes.items || [];

    const oldest = pendingList.reduce((max, cur) => ((cur.ageDays || 0) > (max?.ageDays || 0) ? cur : max), null);
    const oldestAgeDays = oldest?.ageDays || 0;

    return {
      totalPending: counts.total || 0,
      countsByType: {
        teacher_leave: counts.teacher_leave || 0,
        concession: counts.concession || 0,
        refund: counts.refund || 0,
        expense: counts.expense || 0,
        payroll_run: counts.payroll_run || 0,
      },
      oldestPendingAgeDays: oldestAgeDays,
      status: oldestAgeDays >= 5 ? "Critical SLA Breach" : oldestAgeDays >= 2 ? "Warning" : "Normal",
      recentPending: (pendingList || []).slice(0, 5).map((p) => ({
        type: p.type,
        title: p.title,
        ageDays: p.ageDays,
        requester: p.requesterName || "Staff Member",
      })),
    };
  },

  get_staff_compliance_summary: async ({ schoolId }) => {
    const teachers = await Teacher.find({ schoolId, status: "active" })
      .populate("userId", "name email")
      .lean();

    const result = [];
    for (const t of teachers.slice(0, 15)) {
      const periodsCount = await Timetable.countDocuments({ schoolId, teacherId: t._id });
      result.push({
        teacherName: t.userId?.name || "Teacher",
        employeeId: t.employeeId,
        specialization: t.subjectSpecialization || t.subjects || "General",
        teachingPeriodsPerWeek: periodsCount,
        note: "Data presented for institutional review, not teacher ranking.",
      });
    }

    return {
      totalActiveTeachers: teachers.length,
      sampleStaff: result,
      disclaimer: "Metrics are for institutional review and operational planning; not for competitive ranking.",
    };
  },

  get_results_trend: async ({ schoolId, classId }) => {
    const examQuery = { schoolId };
    const exams = await Exam.find(examQuery).sort({ startDate: 1 }).lean();

    const trend = [];
    for (const exam of exams) {
      const match = { examId: exam._id, isPublished: true };
      if (classId) match.classId = classId;

      const results = await Result.find(match).select("percentage isPassed").lean();
      if (results.length > 0) {
        const passedCount = results.filter((r) => r.isPassed).length;
        const passPercent = Math.round((passedCount / results.length) * 100);
        const avgPct = Math.round((results.reduce((a, b) => a + (b.percentage || 0), 0) / results.length) * 10) / 10;

        trend.push({
          examName: exam.name,
          date: exam.startDate,
          studentsAppeared: results.length,
          classAveragePercentage: avgPct,
          passPercentage: passPercent,
        });
      }
    }

    return trend;
  },

  get_admission_funnel: async ({ schoolId }) => {
    const inquiries = await AdmissionInquiry.aggregate([
      { $match: { schoolId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stageMap = {};
    inquiries.forEach((i) => (stageMap[i._id] = i.count));
    const total = Object.values(stageMap).reduce((a, b) => a + b, 0);

    const classes = await ClassSection.find({ schoolId }).lean();
    let totalCapacity = 0;
    let totalEnrolled = 0;

    for (const c of classes) {
      const cap = c.capacity || 40;
      const count = await Student.countDocuments({ schoolId, classId: c._id, status: "active" });
      totalCapacity += cap;
      totalEnrolled += count;
    }

    return {
      totalInquiries: total,
      newInquiries: stageMap.new || 0,
      contacted: stageMap.contacted || 0,
      visitsScheduled: stageMap.visit_scheduled || 0,
      applicationsSubmitted: stageMap.application_submitted || 0,
      admitted: stageMap.admitted || 0,
      lost: stageMap.lost || 0,
      conversionRate: total > 0 ? Math.round(((stageMap.admitted || 0) / total) * 100) + "%" : "0%",
      schoolSeatCapacity: totalCapacity,
      totalEnrolledStudents: totalEnrolled,
      availableSeatsRemaining: Math.max(0, totalCapacity - totalEnrolled),
    };
  },

  get_upcoming_events: async ({ schoolId, days = 7 }) => {
    const now = new Date();
    const future = new Date(now.getTime() + (Number(days) || 7) * 24 * 60 * 60 * 1000);

    const events = await AcademicEvent.find({
      schoolId,
      status: "published",
      startDate: { $gte: now, $lte: future },
    })
      .sort({ startDate: 1 })
      .lean();

    return events.map((ev) => ({
      title: ev.title,
      type: ev.type,
      startDate: ev.startDate,
      endDate: ev.endDate,
      audience: ev.audience,
      isHoliday: ["holiday", "vacation"].includes(ev.type),
    }));
  },
};

const principalToolHandlers = { ...adminToolHandlers, ...principalSpecificHandlers };

module.exports = {
  principalToolDeclarations,
  principalToolHandlers,
};
