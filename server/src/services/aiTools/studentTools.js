const Student = require("../../models/Student.model");
const Attendance = require("../../models/Attendance.model");
const FeeTransaction = require("../../models/FeeTransaction.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");

// ─── Tool Declarations ─────────────────────────────────────────────────────
const studentToolDeclarations = [
  {
    name: "get_my_profile",
    description: "Get the student's own profile: name, class, roll number, admission number, etc.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_my_attendance",
    description: "Get the student's own attendance records for a month/year or overall summary.",
    parameters: {
      type: "OBJECT",
      properties: {
        month: { type: "NUMBER", description: "Month (1-12)" },
        year: { type: "NUMBER", description: "Year (e.g. 2024)" },
      },
      required: [],
    },
  },
  {
    name: "get_my_results",
    description: "Get the student's own exam results.",
    parameters: {
      type: "OBJECT",
      properties: {
        examName: { type: "STRING", description: "Optional exam name to filter" },
      },
      required: [],
    },
  },
  {
    name: "get_my_fees",
    description: "Get the student's fee payment status and any pending dues.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
];

// ─── Tool Implementations ──────────────────────────────────────────────────
const studentToolHandlers = {
  get_my_profile: async ({ studentRecord }) => {
    if (!studentRecord) return { error: "Student profile not found." };

    return {
      name: studentRecord.name,
      admissionNumber: studentRecord.admissionNumber,
      rollNumber: studentRecord.rollNumber,
      class: studentRecord.classId
        ? `${studentRecord.classId.className} ${studentRecord.classId.section || ""}`.trim()
        : "N/A",
      gender: studentRecord.gender,
      dob: studentRecord.dob?.toISOString().split("T")[0],
      bloodGroup: studentRecord.bloodGroup,
      address: studentRecord.address,
      status: studentRecord.status,
    };
  },

  get_my_attendance: async ({ studentRecord, month, year }) => {
    if (!studentRecord) return { error: "Student profile not found." };

    const filter = { studentId: studentRecord._id };
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).lean();

    const summary = { present: 0, absent: 0, late: 0, leave: 0 };
    records.forEach((r) => {
      summary[r.status] = (summary[r.status] || 0) + 1;
    });

    const total = records.length;
    return {
      summary,
      totalDays: total,
      attendancePercentage:
        total > 0 ? `${((summary.present / total) * 100).toFixed(1)}%` : "N/A",
      recentRecords: records.slice(0, 10).map((r) => ({
        date: r.date?.toISOString().split("T")[0],
        status: r.status,
        remarks: r.remarks,
      })),
    };
  },

  get_my_results: async ({ studentRecord, examName }) => {
    if (!studentRecord) return { error: "Student profile not found." };

    let examFilter = {};
    if (examName) {
      const exams = await Exam.find({ name: { $regex: examName, $options: "i" } }).lean();
      examFilter.examId = { $in: exams.map((e) => e._id) };
    }

    const results = await Result.find({
      studentId: studentRecord._id,
      ...examFilter,
    })
      .populate("examId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return results.map((r) => ({
      examName: r.examId?.name,
      percentage: r.percentage + "%",
      grade: r.grade,
      status: r.overallStatus,
      totalMarks: r.totalMarksObtained,
      maxMarks: r.totalMaxMarks,
      subjects: r.marksObtained,
      remarks: r.remarks,
    }));
  },

  get_my_fees: async ({ studentRecord }) => {
    if (!studentRecord) return { error: "Student profile not found." };

    const fees = await FeeTransaction.find({ studentId: studentRecord._id })
      .populate("feeStructureId", "title totalAmount")
      .lean();

    let totalDue = 0;
    let totalPaid = 0;

    const feeList = fees.map((f) => {
      totalDue += f.amountDue;
      totalPaid += f.amountPaid;
      return {
        title: f.feeStructureId?.title || "N/A",
        amountDue: f.amountDue,
        amountPaid: f.amountPaid,
        outstanding: f.amountDue - f.amountPaid,
        status: f.status,
        paidOn: f.paidOn?.toISOString().split("T")[0] || null,
        receiptNumber: f.receiptNumber || null,
      };
    });

    return {
      totalDue,
      totalPaid,
      totalOutstanding: totalDue - totalPaid,
      fees: feeList,
    };
  },
};

module.exports = { studentToolDeclarations, studentToolHandlers };
