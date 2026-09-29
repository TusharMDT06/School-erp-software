const mongoose = require("mongoose");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Timetable = require("../models/Timetable.model");
const Attendance = require("../models/Attendance.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const Circular = require("../models/Circular.model");
const CircularReceipt = require("../models/CircularReceipt.model");
const Student = require("../models/Student.model");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const { isWorkingDay } = require("../utils/workingDay");
const { safeGet, safeSet } = require("../config/redis");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * GET /api/teacher/dashboard
 * Teacher overview dashboard aggregated with Promise.all and 60s Redis caching.
 */
const getTeacherDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const teacher = await Teacher.findOne({ userId }).populate("assignedClasses");
    if (!teacher) {
      throw new ApiError(404, "Teacher profile not found.");
    }

    const teacherId = teacher._id.toString();
    const cacheKey = `teacher:dashboard:${teacherId}`;

    // Check Redis cache (60s TTL)
    const cachedData = await safeGet(cacheKey);
    if (cachedData) {
      try {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cachedData), "Teacher dashboard retrieved (cached)."));
      } catch {}
    }

    const now = new Date();
    const todayNormalized = normalizeDate(now);
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayDay = dayNames[now.getDay()];
    const todayDateStr = now.toISOString().slice(0, 10);
    const schoolId = req.user.schoolId || teacher.assignedClasses?.[0]?.schoolId;

    // Compile list of classes assigned to teacher
    const assignedClassIds = (teacher.assignedClasses || []).map((c) => c._id || c);
    const classTeacherClasses = await ClassSection.find({ classTeacherId: teacher._id }).select("_id className section");
    const allRelevantClassIds = Array.from(
      new Set([
        ...assignedClassIds.map((id) => id.toString()),
        ...classTeacherClasses.map((c) => c._id.toString()),
      ])
    ).map((id) => new mongoose.Types.ObjectId(id));

    // Parallel fetch tasks
    const [
      workingDayCheck,
      timetableSlots,
      substitutionsToday,
      coveredByOthersToday,
      pendingAttendanceClasses,
      homeworkToReviewCount,
      upcomingExamsList,
      latestLeave,
      pendingCircularsCount,
      classTeacherClass,
      birthdaysList,
      teacherHomeworks,
    ] = await Promise.all([
      // 1. Working Day check
      schoolId ? isWorkingDay(schoolId, todayNormalized) : Promise.resolve({ isWorkingDay: true }),

      // 2. Regular Timetable periods for today
      Timetable.find({
        teacherId: teacher._id,
        day: todayDay,
      })
        .populate("classId", "className section")
        .sort({ periodIndex: 1, startTime: 1 })
        .lean(),

      // 3. Substitutions where this teacher is assigned today
      SubstituteAssignment.find({
        substituteTeacherId: teacher._id,
        date: todayDateStr,
        status: { $in: ["assigned", "acknowledged", "completed"] },
      })
        .populate("classId", "className section")
        .lean(),

      // 4. Periods where this teacher is absent and covered by another substitute
      SubstituteAssignment.find({
        absentTeacherId: teacher._id,
        date: todayDateStr,
        status: { $in: ["assigned", "acknowledged", "completed"] },
      }).lean(),

      // 5. Classes where attendance has NOT yet been marked today
      Promise.all(
        allRelevantClassIds.map(async (classId) => {
          const marked = await Attendance.findOne({ classId, date: todayNormalized });
          if (!marked) {
            return ClassSection.findById(classId).select("_id className section");
          }
          return null;
        })
      ),

      // 6. Homework count awaiting review
      (async () => {
        const teacherHws = await Homework.find({ teacherId: teacher._id }).select("_id");
        const hwIds = teacherHws.map((h) => h._id);
        if (hwIds.length === 0) return 0;
        return HomeworkSubmission.countDocuments({ homeworkId: { $in: hwIds }, status: "submitted" });
      })(),

      // 7. Upcoming exams (next 14 days)
      Exam.find({
        classId: { $in: allRelevantClassIds },
        "subjects.examDate": {
          $gte: now,
          $lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      })
        .populate("classId", "className section")
        .sort({ "subjects.examDate": 1 })
        .limit(10)
        .lean(),

      // 8. Latest leave request status
      LeaveRequest.findOne({ applicantId: userId, requesterRole: "teacher" })
        .sort({ createdAt: -1 })
        .lean(),

      // 9. Circulars pending acknowledgement
      (async () => {
        if (!schoolId) return 0;
        const circs = await Circular.find({
          schoolId,
          status: "published",
          audienceRoles: "teacher",
          requiresAcknowledgement: true,
        }).select("_id");

        if (circs.length === 0) return 0;

        const acknowledgedReceipts = await CircularReceipt.countDocuments({
          circularId: { $in: circs.map((c) => c._id) },
          userId,
          acknowledgedAt: { $ne: null },
        });

        return Math.max(0, circs.length - acknowledgedReceipts);
      })(),

      // 10. Class teacher snapshot class (if teacher is a class teacher)
      ClassSection.findOne({ classTeacherId: teacher._id }).lean(),

      // 11. Birthdays today in teacher's assigned classes
      (async () => {
        if (allRelevantClassIds.length === 0) return [];
        const currentMonth = now.getMonth() + 1; // 1-indexed for MongoDB $month
        const currentDay = now.getDate();

        return Student.find({
          classId: { $in: allRelevantClassIds },
          $expr: {
            $and: [
              { $eq: [{ $month: "$dob" }, currentMonth] },
              { $eq: [{ $dayOfMonth: "$dob" }, currentDay] },
            ],
          },
        })
          .populate("classId", "className section")
          .select("name rollNumber dob classId")
          .lean();
      })(),

      // 12. Recent homework for marks / review pending
      Homework.find({ teacherId: teacher._id, status: "published" }).select("_id classId").lean(),
    ]);

    // ── Build todaysPeriods ───────────────────────────────────────────────────
    let todaysPeriods = [];
    let holidayReason = null;

    if (!workingDayCheck.isWorkingDay) {
      holidayReason = workingDayCheck.reason || "Holiday";
      todaysPeriods = [];
    } else {
      const absentPeriodRefs = new Set(coveredByOthersToday.map((c) => c.periodRef));

      // Regular slots
      timetableSlots.forEach((slot) => {
        const periodKey = slot.periodLabel || `Period ${slot.periodIndex}`;
        if (!absentPeriodRefs.has(periodKey) && !absentPeriodRefs.has(`${slot.day}_${slot.periodIndex}`)) {
          todaysPeriods.push({
            period: periodKey,
            periodIndex: slot.periodIndex,
            startTime: slot.startTime || "09:00",
            endTime: slot.endTime || "09:45",
            className: slot.classId?.className || "Class",
            section: slot.classId?.section || "",
            subject: slot.subject,
            isSubstitution: false,
          });
        }
      });

      // Substitutions slots
      substitutionsToday.forEach((sub) => {
        todaysPeriods.push({
          period: sub.periodRef || "Substitution Period",
          periodIndex: 99,
          startTime: "Sub",
          endTime: "",
          className: sub.classId?.className || "Class",
          section: sub.classId?.section || "",
          subject: sub.subject,
          isSubstitution: true,
          notes: sub.notes,
        });
      });

      // Sort by start time or period
      todaysPeriods.sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
    }

    // ── Build attendancePending list ─────────────────────────────────────────
    const attendancePending = pendingAttendanceClasses.filter(Boolean).map((cls) => ({
      classId: cls._id,
      className: cls.className,
      section: cls.section,
    }));

    // ── Build marksEntryPending list ─────────────────────────────────────────
    // Check exams in teacher's assigned classes where results are incomplete
    const teacherSubjects = teacher.subjects || [];
    const recentExams = await Exam.find({
      classId: { $in: allRelevantClassIds },
      academicYear: teacher.assignedClasses?.[0]?.academicYear || "2024-2025",
    })
      .populate("classId", "className section")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const marksEntryPending = [];
    for (const exam of recentExams) {
      for (const subj of exam.subjects || []) {
        const isTeacherSubject = teacherSubjects.some(
          (s) => s.trim().toLowerCase() === subj.subjectName.trim().toLowerCase()
        );
        if (isTeacherSubject) {
          const totalStudentsInClass = await Student.countDocuments({ classId: exam.classId?._id });
          const enteredResults = await Result.countDocuments({
            examId: exam._id,
            "marksObtained.subjectName": subj.subjectName,
          });

          if (enteredResults < totalStudentsInClass) {
            marksEntryPending.push({
              examId: exam._id,
              examName: exam.examName,
              className: exam.classId?.className || "",
              section: exam.classId?.section || "",
              subject: subj.subjectName,
              examDate: subj.examDate,
              missingCount: totalStudentsInClass - enteredResults,
              totalStudents: totalStudentsInClass,
            });
          }
        }
      }
    }

    // ── Build classSnapshot (for Class Teachers only) ────────────────────────
    let classSnapshot = null;
    if (classTeacherClass) {
      const classId = classTeacherClass._id;
      const totalStudents = await Student.countDocuments({ classId });

      // Today's attendance percentage
      const todayAttendance = await Attendance.find({ classId, date: todayNormalized }).lean();
      const presentCount = todayAttendance.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const attendanceTodayPercent =
        totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

      // Homework completion percentage for recent active homework in this class
      const classHomeworks = await Homework.find({ classId, status: "published" })
        .sort({ dueDate: -1 })
        .limit(3)
        .select("_id");

      let homeworkCompletionPercent = 0;
      if (classHomeworks.length > 0 && totalStudents > 0) {
        const totalExpected = classHomeworks.length * totalStudents;
        const totalSubmitted = await HomeworkSubmission.countDocuments({
          homeworkId: { $in: classHomeworks.map((h) => h._id) },
          status: { $in: ["submitted", "reviewed"] },
        });
        homeworkCompletionPercent = Math.round((totalSubmitted / totalExpected) * 100);
      }

      classSnapshot = {
        isClassTeacher: true,
        classId: classTeacherClass._id,
        className: classTeacherClass.className,
        section: classTeacherClass.section,
        totalStudents,
        attendanceTodayPercent,
        homeworkCompletionPercent,
        attendanceMarkedToday: todayAttendance.length > 0,
      };
    }

    // ── Format upcoming exams ────────────────────────────────────────────────
    const formattedUpcomingExams = [];
    upcomingExamsList.forEach((exam) => {
      exam.subjects?.forEach((sub) => {
        if (sub.examDate && new Date(sub.examDate) >= now) {
          formattedUpcomingExams.push({
            examId: exam._id,
            examName: exam.examName,
            className: exam.classId?.className || "",
            section: exam.classId?.section || "",
            subjectName: sub.subjectName,
            examDate: sub.examDate,
            maxMarks: sub.maxMarks,
          });
        }
      });
    });
    formattedUpcomingExams.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

    // ── Format birthdays today ───────────────────────────────────────────────
    const formattedBirthdays = birthdaysList.map((st) => ({
      id: st._id,
      name: st.name,
      rollNumber: st.rollNumber,
      className: st.classId?.className || "",
      section: st.classId?.section || "",
      dob: st.dob,
    }));

    const responseData = {
      todaysPeriods,
      holidayReason,
      attendancePending,
      marksEntryPending,
      homeworkToReview: homeworkToReviewCount,
      upcomingExams: formattedUpcomingExams.slice(0, 8),
      leaveStatus: latestLeave
        ? {
            id: latestLeave._id,
            leaveType: latestLeave.leaveType,
            status: latestLeave.status,
            fromDate: latestLeave.fromDate,
            toDate: latestLeave.toDate,
            reason: latestLeave.reason,
            decisionRemarks: latestLeave.decisionRemarks,
          }
        : null,
      circularsPendingAck: pendingCircularsCount,
      classSnapshot,
      birthdaysToday: formattedBirthdays,
    };

    // Cache in Redis for 60 seconds
    await safeSet(cacheKey, JSON.stringify(responseData), 60);

    res.status(200).json(new ApiResponse(200, responseData, "Teacher dashboard loaded successfully."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeacherDashboard,
};
