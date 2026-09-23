const Student = require("../../models/Student.model");
const Teacher = require("../../models/Teacher.model");
const Attendance = require("../../models/Attendance.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");
const ClassSection = require("../../models/ClassSection.model");

// ─── Tool Declarations ─────────────────────────────────────────────────────
const teacherToolDeclarations = [
  {
    name: "get_my_classes",
    description: "Get the list of classes assigned to this teacher.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_my_students",
    description: "Get students in a specific class taught by this teacher.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID (optional; defaults to all assigned classes)" },
      },
      required: [],
    },
  },
  {
    name: "get_class_attendance",
    description: "Get attendance data for a class for a specific date or month.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID to check attendance for" },
        date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
        month: { type: "NUMBER", description: "Month number (1-12)" },
        year: { type: "NUMBER", description: "Year (e.g. 2024)" },
      },
      required: [],
    },
  },
  {
    name: "get_student_results",
    description: "Get exam results for students in my class.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID (optional)" },
        examName: { type: "STRING", description: "Exam name to search for" },
      },
      required: [],
    },
  },
];

// ─── Tool Implementations ──────────────────────────────────────────────────
const teacherToolHandlers = {
  get_my_classes: async ({ teacherRecord }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const classes = await ClassSection.find({
      _id: { $in: teacherRecord.assignedClasses },
    }).lean();

    const result = [];
    for (const cls of classes) {
      const studentCount = await Student.countDocuments({
        classId: cls._id,
        status: "active",
      });
      result.push({
        id: cls._id,
        name: `${cls.className} ${cls.section || ""}`.trim(),
        studentCount,
      });
    }
    return result;
  },

  get_my_students: async ({ teacherRecord, classId }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClassIds = teacherRecord.assignedClasses.map((id) => id.toString());
    const filterClassIds = classId
      ? allowedClassIds.filter((id) => id === classId)
      : allowedClassIds;

    if (classId && !allowedClassIds.includes(classId)) {
      return { error: "You are not assigned to that class." };
    }

    const students = await Student.find({
      classId: { $in: filterClassIds },
      status: "active",
    })
      .populate("classId", "className section")
      .select("name admissionNumber rollNumber gender classId")
      .lean();

    return students.map((s) => ({
      name: s.name,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      gender: s.gender,
      class: s.classId ? `${s.classId.className} ${s.classId.section || ""}`.trim() : "N/A",
    }));
  },

  get_class_attendance: async ({ teacherRecord, classId, date, month, year }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClassIds = teacherRecord.assignedClasses.map((id) => id.toString());
    if (classId && !allowedClassIds.includes(classId)) {
      return { error: "You are not assigned to that class." };
    }

    const filterClasses = classId ? [classId] : allowedClassIds;
    const filter = { classId: { $in: filterClasses } };

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    const records = await Attendance.find(filter)
      .populate({ path: "studentId", select: "name admissionNumber" })
      .lean();

    const summary = { present: 0, absent: 0, late: 0, leave: 0 };
    const details = records.map((r) => {
      summary[r.status] = (summary[r.status] || 0) + 1;
      return {
        studentName: r.studentId?.name,
        status: r.status,
        date: r.date?.toISOString().split("T")[0],
        remarks: r.remarks,
      };
    });

    return { summary, details: details.slice(0, 30) };
  },

  get_student_results: async ({ teacherRecord, classId, examName }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClassIds = teacherRecord.assignedClasses.map((id) => id.toString());
    if (classId && !allowedClassIds.includes(classId)) {
      return { error: "You are not assigned to that class." };
    }

    const filterClassIds = classId ? [classId] : allowedClassIds;
    const students = await Student.find({
      classId: { $in: filterClassIds },
    }).select("_id name admissionNumber").lean();

    const studentIds = students.map((s) => s._id);

    let examFilter = {};
    if (examName) {
      const exams = await Exam.find({ name: { $regex: examName, $options: "i" } }).lean();
      examFilter.examId = { $in: exams.map((e) => e._id) };
    }

    const results = await Result.find({
      studentId: { $in: studentIds },
      ...examFilter,
    })
      .populate("examId", "name")
      .populate("studentId", "name admissionNumber")
      .lean();

    return results.slice(0, 30).map((r) => ({
      studentName: r.studentId?.name,
      examName: r.examId?.name,
      percentage: r.percentage + "%",
      grade: r.grade,
      status: r.overallStatus,
    }));
  },
};

module.exports = { teacherToolDeclarations, teacherToolHandlers };
