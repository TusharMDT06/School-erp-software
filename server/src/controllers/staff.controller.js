const mongoose = require("mongoose");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Timetable = require("../models/Timetable.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const Attendance = require("../models/Attendance.model");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/principal/staff/overview
 * Compliance metrics per teacher:
 * - assigned classes
 * - periods per week (from Timetable)
 * - leave days this month and this year
 * - attendance-marking compliance (% marked before 10:00 AM cutoff)
 * - marks-entry timeliness (days from exam to result entry)
 * - pending homework reviews (0)
 * Labeled for review, not ranking.
 */
const getStaffOverview = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;

    const teachers = await Teacher.find()
      .populate("userId", "name email profileImage status")
      .populate("assignedClasses", "className section academicYear")
      .lean();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfYear = new Date(currentYear, 0, 1);

    const staffList = [];

    for (const teacher of teachers) {
      if (!teacher.userId) continue;

      const teacherUserId = teacher.userId._id;
      const teacherDocId = teacher._id;

      // 1. Periods per week from Timetable
      const periodsCount = await Timetable.countDocuments({
        schoolId,
        teacherId: teacherDocId,
      });

      // 2. Approved leave days this month & year
      const leaves = await LeaveRequest.find({
        applicantId: teacherUserId,
        status: "approved",
        startDate: { $gte: startOfYear },
      }).lean();

      let leaveDaysThisYear = 0;
      let leaveDaysThisMonth = 0;

      leaves.forEach((lv) => {
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate || lv.startDate);
        const days = Math.max(
          1,
          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        );

        leaveDaysThisYear += days;
        if (start >= startOfMonth) {
          leaveDaysThisMonth += days;
        }
      });

      // 3. Attendance-marking compliance
      // Teaching days marked by this teacher or for this teacher's assigned classes
      const assignedClassIds = (teacher.assignedClasses || []).map((c) => c._id);
      const classTeacherSections = await ClassSection.find({
        classTeacherId: teacherDocId,
      })
        .select("_id")
        .lean();
      classTeacherSections.forEach((c) => assignedClassIds.push(c._id));

      let attendanceCompliancePct = 100;
      let totalAttendanceMarked = 0;
      let markedBeforeCutoff = 0;

      if (assignedClassIds.length > 0) {
        const attendances = await Attendance.find({
          classId: { $in: assignedClassIds },
          createdAt: { $gte: startOfMonth },
        })
          .select("createdAt date")
          .lean();

        totalAttendanceMarked = attendances.length;
        attendances.forEach((att) => {
          if (att.createdAt) {
            const created = new Date(att.createdAt);
            const hours = created.getHours();
            const minutes = created.getMinutes();
            // 10:00 AM cutoff
            if (hours < 10 || (hours === 10 && minutes === 0)) {
              markedBeforeCutoff += 1;
            }
          }
        });

        if (totalAttendanceMarked > 0) {
          attendanceCompliancePct = Math.round(
            (markedBeforeCutoff / totalAttendanceMarked) * 100
          );
        }
      }

      // 4. Marks entry timeliness (days between exam date and result entry)
      const resultsEntered = await Result.find({
        enteredBy: teacherDocId,
      })
        .populate("examId", "createdAt subjects")
        .limit(30)
        .lean();

      let avgDaysToEnter = 0;
      if (resultsEntered.length > 0) {
        let totalDays = 0;
        let counted = 0;

        resultsEntered.forEach((resDoc) => {
          if (resDoc.examId && resDoc.createdAt) {
            const examRefDate = resDoc.examId.createdAt;
            const diffDays = Math.max(
              0,
              Math.round(
                (new Date(resDoc.createdAt) - new Date(examRefDate)) /
                  (1000 * 60 * 60 * 24)
              )
            );
            totalDays += diffDays;
            counted++;
          }
        });

        avgDaysToEnter = counted > 0 ? Math.round((totalDays / counted) * 10) / 10 : 0;
      }

      staffList.push({
        teacherId: teacherDocId,
        userId: teacherUserId,
        name: teacher.userId.name,
        email: teacher.userId.email,
        employeeId: teacher.employeeId,
        subjects: teacher.subjects || [],
        assignedClasses: (teacher.assignedClasses || []).map(
          (c) => `${c.className} - ${c.section}`
        ),
        periodsPerWeek: periodsCount,
        leaveDaysThisMonth,
        leaveDaysThisYear,
        compliance: {
          attendanceCompliancePct,
          totalAttendanceMarked,
          markedBeforeCutoff,
          avgDaysToEnterMarks: avgDaysToEnter,
          pendingHomeworkReviews: 0, // Placeholder until Phase 9
        },
      });
    }

    // Default alphabetical sort (NEVER sort by a leaderboard rank)
    staffList.sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json(
      ApiResponse.success(200, "Staff overview loaded successfully", {
        forReviewNotRanking: true,
        notice: "for review, not ranking",
        staff: staffList,
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStaffOverview,
};
