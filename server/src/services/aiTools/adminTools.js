const Student = require("../../models/Student.model");
const Teacher = require("../../models/Teacher.model");
const User = require("../../models/User.model");
const Attendance = require("../../models/Attendance.model");
const FeeTransaction = require("../../models/FeeTransaction.model");
const FeeStructure = require("../../models/FeeStructure.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");
const ClassSection = require("../../models/ClassSection.model");

// ─── Tool Declarations (Gemini function-calling schema) ───────────────────
const adminToolDeclarations = [
  {
    name: "get_school_overview",
    description: "Get overall school statistics: total students, teachers, classes, fee collection summary, and pending fees.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_students_list",
    description: "Get a list of students. Can filter by class name/section.",
    parameters: {
      type: "OBJECT",
      properties: {
        className: { type: "STRING", description: "Optional class name to filter (e.g. '10A')" },
        status: { type: "STRING", description: "Optional status filter: active, transferred, alumni" },
        limit: { type: "NUMBER", description: "Max number of students to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_teachers_list",
    description: "Get a list of teachers with their subjects and assigned classes.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Max number of teachers to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_attendance_summary",
    description: "Get attendance summary for a class or specific student for a given date or month.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Optional class ID to filter" },
        date: { type: "STRING", description: "Optional date in YYYY-MM-DD format" },
        month: { type: "NUMBER", description: "Optional month number (1-12)" },
        year: { type: "NUMBER", description: "Optional year (e.g. 2024)" },
      },
      required: [],
    },
  },
  {
    name: "get_fee_defaulters",
    description: "Get list of students with pending or overdue fees.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Max number of defaulters to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_exam_results_summary",
    description: "Get result statistics for an exam: pass/fail counts, average percentage, top scorers.",
    parameters: {
      type: "OBJECT",
      properties: {
        examName: { type: "STRING", description: "Exam name to search for (partial match)" },
        limit: { type: "NUMBER", description: "Max results to return" },
      },
      required: [],
    },
  },
  {
    name: "get_classes_list",
    description: "Get list of all classes and sections with their student counts.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
];

// ─── Tool Implementations ──────────────────────────────────────────────────
const adminToolHandlers = {
  get_school_overview: async ({ schoolId }) => {
    const [totalStudents, totalTeachers, totalClasses, feeStats] = await Promise.all([
      Student.countDocuments({ status: "active" }),
      Teacher.countDocuments(),
      ClassSection.countDocuments({ schoolId }),
      FeeTransaction.aggregate([
        {
          $group: {
            _id: null,
            totalCollected: { $sum: "$amountPaid" },
            totalDue: { $sum: "$amountDue" },
            pendingCount: {
              $sum: { $cond: [{ $in: ["$status", ["pending", "overdue", "partial"]] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const fees = feeStats[0] || { totalCollected: 0, totalDue: 0, pendingCount: 0 };

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      feeCollected: fees.totalCollected,
      totalFeeDue: fees.totalDue,
      pendingFeeCount: fees.pendingCount,
      collectionRate: fees.totalDue > 0
        ? `${((fees.totalCollected / fees.totalDue) * 100).toFixed(1)}%`
        : "N/A",
    };
  },

  get_students_list: async ({ schoolId, className, status, limit = 20 }) => {
    let classFilter = {};
    if (className) {
      const cls = await ClassSection.findOne({
        schoolId,
        $or: [
          { className: { $regex: className, $options: "i" } },
          { section: { $regex: className, $options: "i" } },
        ],
      });
      if (cls) classFilter.classId = cls._id;
    }

    const query = { ...classFilter };
    if (status) query.status = status;

    const students = await Student.find(query)
      .populate("classId", "className section")
      .limit(Math.min(limit, 50))
      .select("name admissionNumber rollNumber status classId gender")
      .lean();

    return students.map((s) => ({
      name: s.name,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      class: s.classId ? `${s.classId.className} ${s.classId.section || ""}`.trim() : "N/A",
      gender: s.gender,
      status: s.status,
    }));
  },

  get_teachers_list: async ({ schoolId, limit = 20 }) => {
    const teachers = await Teacher.find()
      .populate("userId", "name email phone")
      .populate("assignedClasses", "name section")
      .limit(Math.min(limit, 50))
      .lean();

    return teachers.map((t) => ({
      name: t.userId?.name || "Unknown",
      email: t.userId?.email,
      employeeId: t.employeeId,
      subjects: t.subjects,
      assignedClasses: t.assignedClasses?.map((c) => `${c.name} ${c.section || ""}`.trim()),
    }));
  },

  get_attendance_summary: async ({ schoolId, classId, date, month, year }) => {
    const filter = {};
    if (classId) filter.classId = classId;

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    const summary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { present: 0, absent: 0, late: 0, leave: 0 };
    summary.forEach((s) => {
      result[s._id] = s.count;
    });

    const total = Object.values(result).reduce((a, b) => a + b, 0);
    result.total = total;
    result.attendanceRate = total > 0 ? `${((result.present / total) * 100).toFixed(1)}%` : "N/A";

    return result;
  },

  get_fee_defaulters: async ({ schoolId, limit = 20 }) => {
    const defaulters = await FeeTransaction.find({
      status: { $in: ["pending", "overdue", "partial"] },
    })
      .populate({
        path: "studentId",
        select: "name admissionNumber classId",
        populate: { path: "classId", select: "name section" },
      })
      .populate("feeStructureId", "title")
      .limit(Math.min(limit, 50))
      .lean();

    return defaulters.map((d) => ({
      studentName: d.studentId?.name || "Unknown",
      admissionNumber: d.studentId?.admissionNumber,
      class: d.studentId?.classId
        ? `${d.studentId.classId.name} ${d.studentId.classId.section || ""}`.trim()
        : "N/A",
      feeTitle: d.feeStructureId?.title,
      amountDue: d.amountDue,
      amountPaid: d.amountPaid,
      outstanding: d.amountDue - d.amountPaid,
      status: d.status,
    }));
  },

  get_exam_results_summary: async ({ schoolId, examName, limit = 10 }) => {
    const examFilter = examName
      ? { name: { $regex: examName, $options: "i" } }
      : {};

    const exams = await Exam.find(examFilter).limit(5).lean();
    if (!exams.length) return { message: "No exams found matching that name." };

    const results = [];
    for (const exam of exams) {
      const stats = await Result.aggregate([
        { $match: { examId: exam._id } },
        {
          $group: {
            _id: "$overallStatus",
            count: { $sum: 1 },
            avgPercentage: { $avg: "$percentage" },
          },
        },
      ]);

      const passCount = stats.find((s) => s._id === "pass")?.count || 0;
      const failCount = stats.find((s) => s._id === "fail")?.count || 0;
      const avgPct = stats.reduce((acc, s) => acc + s.avgPercentage * s.count, 0) /
        (passCount + failCount || 1);

      const topScorers = await Result.find({ examId: exam._id })
        .sort({ percentage: -1 })
        .limit(limit)
        .populate({ path: "studentId", select: "name admissionNumber" })
        .lean();

      results.push({
        examName: exam.name,
        totalAppeared: passCount + failCount,
        passed: passCount,
        failed: failCount,
        averagePercentage: avgPct.toFixed(1) + "%",
        topScorers: topScorers.map((r) => ({
          name: r.studentId?.name,
          percentage: r.percentage + "%",
          grade: r.grade,
        })),
      });
    }
    return results;
  },

  get_classes_list: async ({ schoolId }) => {
    const classes = await ClassSection.find({ schoolId }).lean();
    const result = [];
    for (const cls of classes) {
      const studentCount = await Student.countDocuments({ classId: cls._id, status: "active" });
      result.push({
        name: `${cls.className} ${cls.section || ""}`.trim(),
        academicYear: cls.academicYear,
        studentCount,
      });
    }
    return result;
  },
};

module.exports = { adminToolDeclarations, adminToolHandlers };
