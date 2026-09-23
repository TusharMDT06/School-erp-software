const Student = require("../../models/Student.model");
const Attendance = require("../../models/Attendance.model");
const FeeTransaction = require("../../models/FeeTransaction.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");

// ─── Tool Declarations ─────────────────────────────────────────────────────
const parentToolDeclarations = [
  {
    name: "get_my_children",
    description: "Get the list of children linked to this parent account.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_child_attendance",
    description: "Get attendance records for a specific child.",
    parameters: {
      type: "OBJECT",
      properties: {
        childAdmissionNumber: {
          type: "STRING",
          description: "Admission number of the child (required if parent has multiple children)",
        },
        month: { type: "NUMBER", description: "Month (1-12)" },
        year: { type: "NUMBER", description: "Year (e.g. 2024)" },
      },
      required: [],
    },
  },
  {
    name: "get_child_results",
    description: "Get exam results for a specific child.",
    parameters: {
      type: "OBJECT",
      properties: {
        childAdmissionNumber: {
          type: "STRING",
          description: "Admission number of the child (required if parent has multiple children)",
        },
        examName: { type: "STRING", description: "Optional exam name to filter" },
      },
      required: [],
    },
  },
  {
    name: "get_child_fees",
    description: "Get fee payment status for a specific child.",
    parameters: {
      type: "OBJECT",
      properties: {
        childAdmissionNumber: {
          type: "STRING",
          description: "Admission number of the child (required if parent has multiple children)",
        },
      },
      required: [],
    },
  },
];

// ─── Helper: Verify child belongs to this parent ───────────────────────────
async function resolveChild(parentUserId, children, childAdmissionNumber) {
  if (!children || children.length === 0) {
    return { error: "No children are linked to your account." };
  }

  if (children.length === 1) {
    return children[0]; // Auto-resolve single child
  }

  if (!childAdmissionNumber) {
    const names = children.map((c) => `${c.name} (${c.admissionNumber})`).join(", ");
    return {
      clarificationNeeded: true,
      message: `You have multiple children: ${names}. Please specify which child's admission number you're asking about.`,
    };
  }

  const child = children.find(
    (c) => c.admissionNumber.toUpperCase() === childAdmissionNumber.toUpperCase()
  );

  if (!child) {
    return { error: "That child is not linked to your account." };
  }

  return child;
}

// ─── Tool Implementations ──────────────────────────────────────────────────
const parentToolHandlers = {
  get_my_children: async ({ children }) => {
    if (!children || children.length === 0) {
      return { message: "No children are linked to your account." };
    }

    return children.map((c) => ({
      name: c.name,
      admissionNumber: c.admissionNumber,
      class: c.classId ? `${c.classId.className} ${c.classId.section || ""}`.trim() : "N/A",
      rollNumber: c.rollNumber,
      status: c.status,
    }));
  },

  get_child_attendance: async ({ parentUserId, children, childAdmissionNumber, month, year }) => {
    const child = await resolveChild(parentUserId, children, childAdmissionNumber);
    if (child.error || child.clarificationNeeded) return child;

    const filter = { studentId: child._id };
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
      child: child.name,
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

  get_child_results: async ({ parentUserId, children, childAdmissionNumber, examName }) => {
    const child = await resolveChild(parentUserId, children, childAdmissionNumber);
    if (child.error || child.clarificationNeeded) return child;

    let examFilter = {};
    if (examName) {
      const exams = await Exam.find({ name: { $regex: examName, $options: "i" } }).lean();
      examFilter.examId = { $in: exams.map((e) => e._id) };
    }

    const results = await Result.find({
      studentId: child._id,
      ...examFilter,
    })
      .populate("examId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return {
      child: child.name,
      results: results.map((r) => ({
        examName: r.examId?.name,
        percentage: r.percentage + "%",
        grade: r.grade,
        status: r.overallStatus,
        totalMarks: r.totalMarksObtained,
        maxMarks: r.totalMaxMarks,
        remarks: r.remarks,
      })),
    };
  },

  get_child_fees: async ({ parentUserId, children, childAdmissionNumber }) => {
    const child = await resolveChild(parentUserId, children, childAdmissionNumber);
    if (child.error || child.clarificationNeeded) return child;

    const fees = await FeeTransaction.find({ studentId: child._id })
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
      };
    });

    return {
      child: child.name,
      totalDue,
      totalPaid,
      totalOutstanding: totalDue - totalPaid,
      fees: feeList,
    };
  },
};

module.exports = { parentToolDeclarations, parentToolHandlers };
