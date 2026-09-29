const mongoose = require("mongoose");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const ClassSection = require("../models/ClassSection.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const Timetable = require("../models/Timetable.model");
const { safeGet, safeSet } = require("../config/redis");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const CACHE_TTL = 300; // 5 minutes

/**
 * Helper to determine scoped class IDs for teacher vs admin/principal
 */
async function getScopedClassIds(req) {
  if (["admin", "superadmin", "principal"].includes(req.user.role)) {
    return null; // Unrestricted
  }

  if (req.user.role === "teacher") {
    const teacher = await Teacher.findOne({ userId: req.user.id }).lean();
    if (!teacher) return [];

    const assigned = (teacher.assignedClasses || []).map((id) => id.toString());
    const classTeacherSections = await ClassSection.find({
      classTeacherId: teacher._id,
    })
      .select("_id")
      .lean();
    classTeacherSections.forEach((c) => assigned.push(c._id.toString()));

    return [...new Set(assigned)].map((id) => new mongoose.Types.ObjectId(id));
  }

  return [];
}

/**
 * GET /api/principal/academics/overview?academicYear=
 * Per exam: school average, pass %, grade distribution
 */
const getAcademicsOverview = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYear } = req.query;
    const scopedClasses = await getScopedClassIds(req);

    const cacheKey = `academics:overview:${schoolId}:${academicYear || "all"}:${
      scopedClasses ? scopedClasses.join(",") : "all"
    }`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const examQuery = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      resultPublished: true,
    };
    if (academicYear) examQuery.academicYear = academicYear;
    if (scopedClasses) examQuery.classId = { $in: scopedClasses };

    const exams = await Exam.find(examQuery)
      .populate("classId", "className section academicYear")
      .sort({ createdAt: -1 })
      .lean();

    const examIds = exams.map((e) => e._id);

    // Aggregate results for these published exams
    const resultsAgg = await Result.aggregate([
      { $match: { examId: { $in: examIds } } },
      {
        $group: {
          _id: "$examId",
          totalStudents: { $sum: 1 },
          avgPercentage: { $avg: "$percentage" },
          passCount: {
            $sum: { $cond: [{ $eq: ["$overallStatus", "pass"] }, 1, 0] },
          },
          grades: { $push: "$grade" },
        },
      },
    ]);

    const aggMap = new Map();
    resultsAgg.forEach((item) => {
      const gradeCounts = {};
      (item.grades || []).forEach((g) => {
        const gradeKey = g || "F";
        gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;
      });

      aggMap.set(item._id.toString(), {
        totalStudents: item.totalStudents,
        avgPercentage: Math.round((item.avgPercentage || 0) * 10) / 10,
        passPercentage:
          item.totalStudents > 0
            ? Math.round((item.passCount / item.totalStudents) * 1000) / 10
            : 0,
        passCount: item.passCount,
        gradeDistribution: gradeCounts,
      });
    });

    const examsOverview = exams.map((ex) => {
      const stats = aggMap.get(ex._id.toString()) || {
        totalStudents: 0,
        avgPercentage: 0,
        passPercentage: 0,
        passCount: 0,
        gradeDistribution: {},
      };

      return {
        examId: ex._id,
        examName: ex.examName,
        academicYear: ex.academicYear,
        classInfo: ex.classId
          ? `${ex.classId.className} - ${ex.classId.section}`
          : "General",
        classId: ex.classId?._id || null,
        subjectsCount: ex.subjects?.length || 0,
        ...stats,
      };
    });

    // Compute macro aggregates
    let overallSumPercentage = 0;
    let totalEvaluated = 0;
    let totalPassed = 0;

    examsOverview.forEach((e) => {
      if (e.totalStudents > 0) {
        overallSumPercentage += e.avgPercentage * e.totalStudents;
        totalEvaluated += e.totalStudents;
        totalPassed += e.passCount;
      }
    });

    const payload = ApiResponse.success(200, "Academics overview loaded successfully", {
      exams: examsOverview,
      summary: {
        totalPublishedExams: exams.length,
        totalStudentsEvaluated: totalEvaluated,
        schoolAveragePercentage:
          totalEvaluated > 0
            ? Math.round((overallSumPercentage / totalEvaluated) * 10) / 10
            : 0,
        overallPassPercentage:
          totalEvaluated > 0
            ? Math.round((totalPassed / totalEvaluated) * 1000) / 10
            : 0,
      },
    });

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/principal/academics/class-comparison?examId=
 * Per class-section: average, pass %, top and bottom scorer
 */
const getClassComparison = async (req, res, next) => {
  try {
    const { examId } = req.query;
    if (!examId) throw new ApiError(400, "Exam ID is required");

    const schoolId = req.user.schoolId;
    const scopedClasses = await getScopedClassIds(req);

    const cacheKey = `academics:class-comparison:${schoolId}:${examId}:${
      scopedClasses ? scopedClasses.join(",") : "all"
    }`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam) throw new ApiError(404, "Exam not found");
    if (!exam.resultPublished) throw new ApiError(400, "Results for this exam are not published yet");

    // Fetch all results for this exam, join with student and class
    const matchStage = { examId: new mongoose.Types.ObjectId(examId) };

    const classStats = await Result.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      ...(scopedClasses
        ? [{ $match: { "student.classId": { $in: scopedClasses } } }]
        : []),
      {
        $group: {
          _id: "$student.classId",
          totalStudents: { $sum: 1 },
          avgPercentage: { $avg: "$percentage" },
          passCount: {
            $sum: { $cond: [{ $eq: ["$overallStatus", "pass"] }, 1, 0] },
          },
          allResults: {
            $push: {
              studentId: "$student._id",
              name: "$student.name",
              admissionNumber: "$student.admissionNumber",
              rollNumber: "$student.rollNumber",
              percentage: "$percentage",
              grade: "$grade",
            },
          },
        },
      },
      {
        $lookup: {
          from: "classsections",
          localField: "_id",
          foreignField: "_id",
          as: "classDetails",
        },
      },
      { $unwind: "$classDetails" },
    ]);

    const formatted = classStats.map((item) => {
      const sorted = (item.allResults || []).sort(
        (a, b) => b.percentage - a.percentage
      );
      const topScorer = sorted.length > 0 ? sorted[0] : null;
      const bottomScorer = sorted.length > 0 ? sorted[sorted.length - 1] : null;

      return {
        classId: item._id,
        className: item.classDetails.className,
        section: item.classDetails.section,
        academicYear: item.classDetails.academicYear,
        totalStudents: item.totalStudents,
        avgPercentage: Math.round((item.avgPercentage || 0) * 10) / 10,
        passPercentage:
          item.totalStudents > 0
            ? Math.round((item.passCount / item.totalStudents) * 1000) / 10
            : 0,
        topScorer,
        bottomScorer,
      };
    });

    // Default alphabetical sort by Class name & section
    formatted.sort((a, b) =>
      `${a.className}-${a.section}`.localeCompare(`${b.className}-${b.section}`)
    );

    const payload = ApiResponse.success(200, "Class comparison loaded successfully", {
      examId,
      examName: exam.examName,
      classes: formatted,
    });

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/principal/academics/subject-analysis?classId=&examId=
 * Subject average, fail %, "needs attention" flag when fail % is above threshold
 */
const getSubjectAnalysis = async (req, res, next) => {
  try {
    const { examId, classId, threshold = 25 } = req.query;
    if (!examId) throw new ApiError(400, "Exam ID is required");

    const schoolId = req.user.schoolId;
    const failThreshold = Number(threshold) || 25;

    const cacheKey = `academics:subjects:${schoolId}:${examId}:${classId || "all"}:${failThreshold}`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam) throw new ApiError(404, "Exam not found");
    if (!exam.resultPublished) throw new ApiError(400, "Results for this exam are not published yet");

    const matchFilter = { examId: new mongoose.Types.ObjectId(examId) };

    let results = [];
    if (classId) {
      results = await Result.find(matchFilter)
        .populate({
          path: "studentId",
          match: { classId: new mongoose.Types.ObjectId(classId) },
          select: "name classId",
        })
        .lean();
      results = results.filter((r) => r.studentId != null);
    } else {
      results = await Result.find(matchFilter).lean();
    }

    const subjectMetrics = (exam.subjects || []).map((sub) => {
      const subName = sub.subjectName;
      const maxMarks = sub.maxMarks || 100;
      const passingMarks = sub.passingMarks || 33;

      let marksSum = 0;
      let count = 0;
      let failCount = 0;

      results.forEach((r) => {
        const found = (r.marksObtained || []).find(
          (m) => m.subjectName?.toLowerCase() === subName.toLowerCase()
        );
        if (found && typeof found.marks === "number") {
          marksSum += found.marks;
          count += 1;
          if (found.marks < passingMarks) {
            failCount += 1;
          }
        }
      });

      const avgMarks = count > 0 ? Math.round((marksSum / count) * 10) / 10 : 0;
      const avgPercentage =
        maxMarks > 0 ? Math.round(((avgMarks / maxMarks) * 100) * 10) / 10 : 0;
      const failPercentage =
        count > 0 ? Math.round(((failCount / count) * 100) * 10) / 10 : 0;
      const needsAttention = failPercentage >= failThreshold;

      return {
        subjectName: subName,
        maxMarks,
        passingMarks,
        studentsCount: count,
        avgMarks,
        avgPercentage,
        failCount,
        failPercentage,
        needsAttention,
      };
    });

    const payload = ApiResponse.success(200, "Subject analysis loaded successfully", {
      examId,
      examName: exam.examName,
      failThreshold,
      subjects: subjectMetrics,
    });

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/principal/academics/trend?classId=
 * Average across exams in date order for a class
 */
const getAcademicsTrend = async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) throw new ApiError(400, "Class ID is required");

    const schoolId = req.user.schoolId;

    const cacheKey = `academics:trend:${schoolId}:${classId}`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Find all published exams for this class or associated with this class
    const exams = await Exam.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      classId: new mongoose.Types.ObjectId(classId),
      resultPublished: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    const trend = [];
    for (const ex of exams) {
      const agg = await Result.aggregate([
        { $match: { examId: ex._id } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            avgPercentage: { $avg: "$percentage" },
            passCount: {
              $sum: { $cond: [{ $eq: ["$overallStatus", "pass"] }, 1, 0] },
            },
          },
        },
      ]);

      const stat = agg[0] || { totalStudents: 0, avgPercentage: 0, passCount: 0 };
      trend.push({
        examId: ex._id,
        examName: ex.examName,
        academicYear: ex.academicYear,
        date: ex.createdAt,
        totalStudents: stat.totalStudents,
        avgPercentage: Math.round((stat.avgPercentage || 0) * 10) / 10,
        passPercentage:
          stat.totalStudents > 0
            ? Math.round((stat.passCount / stat.totalStudents) * 1000) / 10
            : 0,
      });
    }

    const payload = ApiResponse.success(200, "Academic trend loaded successfully", {
      classId,
      trend,
    });

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/principal/academics/toppers?examId=&limit=
 */
const getExamToppers = async (req, res, next) => {
  try {
    const { examId, limit = 10 } = req.query;
    if (!examId) throw new ApiError(400, "Exam ID is required");

    const schoolId = req.user.schoolId;
    const numLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const cacheKey = `academics:toppers:${schoolId}:${examId}:${numLimit}`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const toppers = await Result.find({ examId: new mongoose.Types.ObjectId(examId) })
      .populate({
        path: "studentId",
        select: "name admissionNumber rollNumber classId",
        populate: { path: "classId", select: "className section" },
      })
      .sort({ percentage: -1 })
      .limit(numLimit)
      .lean();

    const formatted = toppers.map((t, idx) => ({
      rank: idx + 1,
      studentId: t.studentId?._id,
      name: t.studentId?.name || "Student",
      admissionNumber: t.studentId?.admissionNumber,
      rollNumber: t.studentId?.rollNumber,
      className: t.studentId?.classId
        ? `${t.studentId.classId.className} - ${t.studentId.classId.section}`
        : "-",
      totalMarksObtained: t.totalMarksObtained,
      totalMaxMarks: t.totalMaxMarks,
      percentage: t.percentage,
      grade: t.grade,
    }));

    const payload = ApiResponse.success(200, "Exam toppers loaded successfully", {
      examId,
      toppers: formatted,
    });

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/principal/academics/teacher-context?examId=
 * Results grouped by the teacher assigned via Timetable subject+class.
 * Must include label "for review, not ranking" and default to alphabetical sort.
 */
const getTeacherContext = async (req, res, next) => {
  try {
    const { examId } = req.query;
    if (!examId) throw new ApiError(400, "Exam ID is required");

    const schoolId = req.user.schoolId;

    const cacheKey = `academics:teacher-context:${schoolId}:${examId}`;
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const exam = await Exam.findById(examId).populate("classId").lean();
    if (!exam) throw new ApiError(404, "Exam not found");

    // Fetch previous exam for this class to compute change
    const previousExam = await Exam.findOne({
      schoolId: exam.schoolId,
      classId: exam.classId?._id,
      resultPublished: true,
      _id: { $ne: exam._id },
      createdAt: { $lt: exam.createdAt },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Map timetable to find teachers for each subject in this class
    const timetables = await Timetable.find({
      schoolId: exam.schoolId,
      classId: exam.classId?._id,
    })
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name email" },
      })
      .lean();

    const subjectTeacherMap = new Map();
    timetables.forEach((t) => {
      const subLower = t.subject?.toLowerCase();
      if (!subjectTeacherMap.has(subLower) && t.teacherId) {
        subjectTeacherMap.set(subLower, {
          teacherId: t.teacherId._id,
          teacherName: t.teacherId.userId?.name || "Teacher",
          employeeId: t.teacherId.employeeId,
        });
      }
    });

    // Current exam results
    const currentResults = await Result.find({ examId: exam._id }).lean();
    const prevResults = previousExam
      ? await Result.find({ examId: previousExam._id }).lean()
      : [];

    const teacherGroup = new Map();

    (exam.subjects || []).forEach((sub) => {
      const subLower = sub.subjectName?.toLowerCase();
      const teacherInfo = subjectTeacherMap.get(subLower) || {
        teacherId: null,
        teacherName: `Teacher (${sub.subjectName})`,
        employeeId: "-",
      };

      // Current subject stats
      let currMarksSum = 0;
      let currCount = 0;
      let currPassCount = 0;

      currentResults.forEach((r) => {
        const found = (r.marksObtained || []).find(
          (m) => m.subjectName?.toLowerCase() === subLower
        );
        if (found && typeof found.marks === "number") {
          currMarksSum += found.marks;
          currCount += 1;
          if (found.marks >= (sub.passingMarks || 33)) {
            currPassCount += 1;
          }
        }
      });

      const currAvgMarks = currCount > 0 ? currMarksSum / currCount : 0;
      const currAvgPct =
        sub.maxMarks > 0 ? (currAvgMarks / sub.maxMarks) * 100 : 0;

      // Previous subject stats
      let prevMarksSum = 0;
      let prevCount = 0;
      if (previousExam) {
        const prevSub = (previousExam.subjects || []).find(
          (s) => s.subjectName?.toLowerCase() === subLower
        );
        const prevMax = prevSub?.maxMarks || sub.maxMarks || 100;

        prevResults.forEach((r) => {
          const found = (r.marksObtained || []).find(
            (m) => m.subjectName?.toLowerCase() === subLower
          );
          if (found && typeof found.marks === "number") {
            prevMarksSum += found.marks;
            prevCount += 1;
          }
        });

        const prevAvgMarks = prevCount > 0 ? prevMarksSum / prevCount : 0;
        const prevAvgPct = prevMax > 0 ? (prevAvgMarks / prevMax) * 100 : 0;
        var changeVsPrevious =
          prevCount > 0
            ? Math.round((currAvgPct - prevAvgPct) * 10) / 10
            : null;
      } else {
        var changeVsPrevious = null;
      }

      const key = `${teacherInfo.teacherName}_${sub.subjectName}`;
      teacherGroup.set(key, {
        teacherName: teacherInfo.teacherName,
        employeeId: teacherInfo.employeeId,
        subject: sub.subjectName,
        className: exam.classId
          ? `${exam.classId.className} - ${exam.classId.section}`
          : "-",
        classStrength: currCount,
        avgPercentage: Math.round(currAvgPct * 10) / 10,
        passPercentage:
          currCount > 0
            ? Math.round((currPassCount / currCount) * 1000) / 10
            : 0,
        changeVsPrevious,
      });
    });

    const list = Array.from(teacherGroup.values());

    // CRITICAL REQUIREMENT: "Label it 'for review, not ranking' in the API response and UI:
    // do not sort by a leaderboard; default sort is alphabetical."
    list.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    const payload = ApiResponse.success(
      200,
      "Teacher context review loaded successfully",
      {
        examId,
        examName: exam.examName,
        forReviewNotRanking: true,
        notice: "for review, not ranking",
        teachers: list,
      }
    );

    await safeSet(cacheKey, JSON.stringify(payload), CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAcademicsOverview,
  getClassComparison,
  getSubjectAnalysis,
  getAcademicsTrend,
  getExamToppers,
  getTeacherContext,
};
