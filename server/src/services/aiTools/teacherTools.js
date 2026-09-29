const Student = require("../../models/Student.model");
const Teacher = require("../../models/Teacher.model");
const Attendance = require("../../models/Attendance.model");
const Result = require("../../models/Result.model");
const Exam = require("../../models/Exam.model");
const ClassSection = require("../../models/ClassSection.model");
const Homework = require("../../models/Homework.model");
const HomeworkSubmission = require("../../models/HomeworkSubmission.model");
const SyllabusUnit = require("../../models/SyllabusUnit.model");
const LessonPlan = require("../../models/LessonPlan.model");
const PTMEvent = require("../../models/PTMEvent.model");
const PTMSlot = require("../../models/PTMSlot.model");
const Quiz = require("../../models/Quiz.model");
const QuizAttempt = require("../../models/QuizAttempt.model");
const StudentRisk = require("../../models/StudentRisk.model");
const SubstituteAssignment = require("../../models/SubstituteAssignment.model");
const StudentRemark = require("../../models/StudentRemark.model");

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
  {
    name: "get_my_pending_tasks",
    description: "Get today's pending tasks: unreviewed homework submissions, attendance marking status, upcoming PTM slots, and unacknowledged substitutions.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_students_needing_attention",
    description: "Get list of students needing academic or behavioral attention in my classes (risk band, low attendance, or concern remarks; strictly non-financial).",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID (optional; defaults to assigned classes)" },
      },
      required: [],
    },
  },
  {
    name: "get_homework_status",
    description: "Get recent homework status for a class: total submissions, reviewed count, and unsubmitted students.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID to check homework for (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_syllabus_progress",
    description: "Get syllabus completion progress and lesson plans status for my subjects and classes.",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "Class ID" },
        subject: { type: "STRING", description: "Subject name (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_ptm",
    description: "Get upcoming Parent-Teacher Meetings (PTM) and my scheduled appointments.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_quiz_summary",
    description: "Get performance summary for an online quiz created by this teacher.",
    parameters: {
      type: "OBJECT",
      properties: {
        quizId: { type: "STRING", description: "Quiz ID (optional; returns recent quizzes if omitted)" },
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
    }).select("className section academicYear");

    // Also check if class teacher
    const classTeacherClasses = await ClassSection.find({
      classTeacherId: teacherRecord._id,
    }).select("className section academicYear");

    return {
      assignedClasses: classes,
      classTeacherOf: classTeacherClasses,
      subjects: teacherRecord.subjects,
    };
  },

  get_my_students: async ({ teacherRecord, classId }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClasses = (teacherRecord.assignedClasses || []).map((c) =>
      typeof c === "object" ? c._id.toString() : c.toString()
    );

    let queryClassIds = allowedClasses;
    if (classId) {
      if (!allowedClasses.includes(classId)) {
        return { error: "You are not assigned to this class." };
      }
      queryClassIds = [classId];
    }

    const students = await Student.find({
      classId: { $in: queryClassIds },
      status: "active",
    })
      .populate("classId", "className section")
      .select("name rollNumber admissionNumber classId")
      .lean();

    return {
      count: students.length,
      students: students.slice(0, 30).map((s) => ({
        firstName: s.name.split(" ")[0],
        rollNumber: s.rollNumber,
        admissionNumber: s.admissionNumber,
        class: `${s.classId?.className}-${s.classId?.section}`,
      })),
    };
  },

  get_class_attendance: async ({ teacherRecord, classId, date, month, year }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

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

    const records = await Attendance.find(filter)
      .populate({ path: "studentId", select: "name admissionNumber" })
      .lean();

    const summary = { present: 0, absent: 0, late: 0, leave: 0 };
    const details = records.map((r) => {
      summary[r.status] = (summary[r.status] || 0) + 1;
      return {
        firstName: r.studentId?.name?.split(" ")[0],
        status: r.status,
        date: r.date?.toISOString().split("T")[0],
        remarks: r.remarks,
      };
    });

    return { summary, sampleDetails: details.slice(0, 20) };
  },

  get_student_results: async ({ teacherRecord, classId, examName }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClasses = (teacherRecord.assignedClasses || []).map((c) =>
      typeof c === "object" ? c._id.toString() : c.toString()
    );
    const filterClassIds = classId ? [classId] : allowedClasses;

    const students = await Student.find({
      classId: { $in: filterClassIds },
    })
      .select("_id name admissionNumber")
      .lean();

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

    return results.slice(0, 25).map((r) => ({
      firstName: r.studentId?.name?.split(" ")[0],
      examName: r.examId?.name,
      percentage: r.percentage + "%",
      grade: r.grade,
      status: r.overallStatus,
    }));
  },

  // ─── PHASE 9C EXTENDED READ-ONLY TOOLS ───────────────────────────────────────

  getMyPendingTasks: async ({ teacherRecord }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const teacherId = teacherRecord._id;
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // 1. Pending homework reviews
    const myHomework = await Homework.find({ teacherId }).select("_id title");
    const hwIds = myHomework.map((h) => h._id);
    const pendingHomeworkReviews = await HomeworkSubmission.countDocuments({
      homeworkId: { $in: hwIds },
      status: "submitted",
    });

    // 2. Today's attendance status for assigned classes
    const assignedClassIds = (teacherRecord.assignedClasses || []).map((c) =>
      typeof c === "object" ? c._id : c
    );
    const attendanceMarkedToday = await Attendance.distinct("classId", {
      classId: { $in: assignedClassIds },
      date: { $gte: todayStart, $lte: todayEnd },
    });
    const classesPendingAttendance = assignedClassIds.length - attendanceMarkedToday.length;

    // 3. Upcoming booked PTM slots
    const upcomingPTMSlots = await PTMSlot.countDocuments({
      teacherId,
      status: "booked",
    });

    // 4. Unacknowledged substitution assignments
    const pendingSubstitutions = await SubstituteAssignment.countDocuments({
      substituteTeacherId: teacherId,
      status: "assigned",
    });

    return {
      pendingTasksSummary: {
        pendingHomeworkReviews,
        classesPendingAttendance: Math.max(0, classesPendingAttendance),
        upcomingPTMSlots,
        pendingSubstitutions,
      },
      message: `You have ${pendingHomeworkReviews} homework submissions to grade, ${pendingSubstitutions} new substitution assignments, and ${upcomingPTMSlots} upcoming booked PTM meetings.`,
    };
  },

  getStudentsNeedingAttention: async ({ teacherRecord, classId }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const allowedClasses = (teacherRecord.assignedClasses || []).map((c) =>
      typeof c === "object" ? c._id.toString() : c.toString()
    );
    const targetClasses = classId ? [classId] : allowedClasses;

    // High and medium risk students (STRIP ALL FINANCIAL REASONS)
    const atRisk = await StudentRisk.find({
      classId: { $in: targetClasses },
      band: { $in: ["high", "medium"] },
    })
      .populate("studentId", "name rollNumber classId")
      .populate("classId", "className section")
      .lean();

    const attentionList = atRisk.map((r) => {
      // Filter out financial factors/reasons
      const nonFinanceReasons = (r.reasons || [])
        .filter((reason) => reason.visibility !== "finance" && reason.factor !== "fees")
        .map((reason) => reason.detail);

      return {
        firstName: r.studentId?.name?.split(" ")[0] || "Student",
        rollNumber: r.studentId?.rollNumber,
        class: `${r.classId?.className}-${r.classId?.section}`,
        riskBand: r.band,
        academicOrDisciplineNotes: nonFinanceReasons,
      };
    });

    return {
      studentsNeedingAttentionCount: attentionList.length,
      students: attentionList.slice(0, 15),
    };
  },

  getHomeworkStatus: async ({ teacherRecord, classId }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const filter = { teacherId: teacherRecord._id };
    if (classId) filter.classId = classId;

    const recentHw = await Homework.find(filter)
      .populate("classId", "className section")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const stats = await Promise.all(
      recentHw.map(async (hw) => {
        const totalClassStudents = await Student.countDocuments({
          classId: hw.classId?._id,
          status: "active",
        });
        const submittedCount = await HomeworkSubmission.countDocuments({
          homeworkId: hw._id,
          status: { $in: ["submitted", "reviewed"] },
        });
        const pendingReview = await HomeworkSubmission.countDocuments({
          homeworkId: hw._id,
          status: "submitted",
        });

        return {
          title: hw.title,
          class: `${hw.classId?.className}-${hw.classId?.section}`,
          dueDate: hw.dueDate?.toISOString().split("T")[0],
          totalStudents: totalClassStudents,
          submittedCount,
          pendingReview,
          submissionRate:
            totalClassStudents > 0
              ? `${Math.round((submittedCount / totalClassStudents) * 100)}%`
              : "0%",
        };
      })
    );

    return { recentHomeworkProgress: stats };
  },

  getSyllabusProgress: async ({ teacherRecord, classId, subject }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const filter = { teacherId: teacherRecord._id };
    if (subject) filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    const units = await SyllabusUnit.find(filter).lean();

    let totalTopics = 0;
    let completedTopics = 0;

    units.forEach((u) => {
      (u.topics || []).forEach((t) => {
        totalTopics++;
        if (t.status === "completed") completedTopics++;
      });
    });

    const completionRate =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return {
      totalUnitsTracked: units.length,
      totalTopics,
      completedTopics,
      completionRate: `${completionRate}%`,
      status: completionRate >= 60 ? "On Schedule" : "Behind Schedule - Needs Attention",
    };
  },

  getUpcomingPTM: async ({ teacherRecord }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    const upcomingEvents = await PTMEvent.find({
      date: { $gte: new Date() },
      status: "open",
    })
      .select("title date startTime endTime slotMinutes")
      .lean();

    const bookedSlots = await PTMSlot.find({
      teacherId: teacherRecord._id,
      status: "booked",
    })
      .populate("ptmId", "title date")
      .populate("studentId", "name rollNumber")
      .sort({ startTime: 1 })
      .lean();

    return {
      upcomingEventsCount: upcomingEvents.length,
      bookedAppointmentsCount: bookedSlots.length,
      bookedSlots: bookedSlots.slice(0, 10).map((s) => ({
        ptmTitle: s.ptmId?.title,
        date: s.ptmId?.date?.toISOString().split("T")[0],
        time: `${s.startTime} - ${s.endTime}`,
        studentFirstName: s.studentId?.name?.split(" ")[0],
      })),
    };
  },

  getQuizSummary: async ({ teacherRecord, quizId }) => {
    if (!teacherRecord) return { error: "Teacher record not found." };

    let quiz;
    if (quizId) {
      quiz = await Quiz.findOne({ _id: quizId, teacherId: teacherRecord._id }).lean();
    } else {
      quiz = await Quiz.findOne({ teacherId: teacherRecord._id })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!quiz) {
      return { message: "No active quizzes found for this teacher." };
    }

    const attempts = await QuizAttempt.find({ quizId: quiz._id }).lean();
    const totalAttempts = attempts.length;
    const passedCount = attempts.filter((a) => a.isPassed).length;
    const averageScore =
      totalAttempts > 0
        ? Math.round(
            attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
          )
        : 0;

    return {
      quizTitle: quiz.title,
      subject: quiz.subject,
      totalQuestions: quiz.questions?.length || 0,
      totalAttempts,
      averageScore: `${averageScore} marks`,
      passRate: totalAttempts > 0 ? `${Math.round((passedCount / totalAttempts) * 100)}%` : "0%",
    };
  },
};

module.exports = { teacherToolDeclarations, teacherToolHandlers };
