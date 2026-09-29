const mongoose = require("mongoose");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const Teacher = require("../models/Teacher.model");
const Timetable = require("../models/Timetable.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const ClassSection = require("../models/ClassSection.model");
const { notify } = require("../services/notification.service");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * GET /api/substitutions/suggestions?date=&periodRef=&periodIndex=
 * Teachers FREE in that period (no timetable clash, not on approved leave, not already substituting),
 * sorted by lightest workload (fewest weekly periods).
 */
const getSubstitutionSuggestions = async (req, res, next) => {
  try {
    const { date, periodRef, periodIndex } = req.query;
    if (!date || (!periodRef && !periodIndex)) {
      throw new ApiError(400, "Date and periodRef/periodIndex are required");
    }

    const schoolId = req.user.schoolId;
    const targetDate = new Date(date + "T00:00:00");
    const dayOfWeek = DAY_NAMES[targetDate.getDay()];

    // Determine numerical period index from param or periodRef string
    let pIdx = periodIndex ? Number(periodIndex) : null;
    if (!pIdx && periodRef) {
      const match = periodRef.match(/\d+/);
      if (match) pIdx = Number(match[0]);
    }
    if (!pIdx) pIdx = 1;

    // 1. Teachers with a Timetable clash in this day & period
    const busyTimetable = await Timetable.find({
      schoolId,
      day: dayOfWeek,
      periodIndex: pIdx,
    })
      .select("teacherId")
      .lean();
    const busyTeacherIds = new Set(busyTimetable.map((t) => t.teacherId.toString()));

    // 2. Teachers on approved leave covering this date
    const approvedLeaves = await LeaveRequest.find({
      schoolId,
      status: "approved",
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate },
    })
      .select("applicantId")
      .lean();

    const leaveUserIds = approvedLeaves.map((l) => l.applicantId);
    const teachersOnLeave = await Teacher.find({
      userId: { $in: leaveUserIds },
    })
      .select("_id")
      .lean();
    teachersOnLeave.forEach((t) => busyTeacherIds.add(t._id.toString()));

    // 3. Teachers already assigned as a substitute for this period & date
    const existingSubstitutions = await SubstituteAssignment.find({
      schoolId,
      date,
      periodRef: periodRef || `Period ${pIdx}`,
      status: { $ne: "cancelled" },
    })
      .select("substituteTeacherId absentTeacherId")
      .lean();

    existingSubstitutions.forEach((s) => {
      if (s.substituteTeacherId) busyTeacherIds.add(s.substituteTeacherId.toString());
      if (s.absentTeacherId) busyTeacherIds.add(s.absentTeacherId.toString());
    });

    // 4. Fetch all active teachers not in busyTeacherIds
    const availableTeachers = await Teacher.find({
      _id: { $nin: Array.from(busyTeacherIds) },
    })
      .populate("userId", "name email profileImage status")
      .lean();

    // 5. Calculate workload for sorting (lightest workload first)
    const suggestions = [];
    for (const t of availableTeachers) {
      if (!t.userId || t.userId.status === "inactive") continue;

      const totalWeeklyPeriods = await Timetable.countDocuments({
        schoolId,
        teacherId: t._id,
      });

      const substitutionsToday = await SubstituteAssignment.countDocuments({
        schoolId,
        date,
        substituteTeacherId: t._id,
        status: { $ne: "cancelled" },
      });

      suggestions.push({
        teacherId: t._id,
        userId: t.userId._id,
        name: t.userId.name,
        email: t.userId.email,
        employeeId: t.employeeId,
        subjects: t.subjects || [],
        weeklyWorkloadPeriods: totalWeeklyPeriods,
        substitutionsToday,
      });
    }

    // Sort by: lightest weekly periods, then least substitutions today, then alphabetical
    suggestions.sort((a, b) => {
      if (a.substitutionsToday !== b.substitutionsToday) {
        return a.substitutionsToday - b.substitutionsToday;
      }
      if (a.weeklyWorkloadPeriods !== b.weeklyWorkloadPeriods) {
        return a.weeklyWorkloadPeriods - b.weeklyWorkloadPeriods;
      }
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json(
      ApiResponse.success(200, "Available substitute suggestions loaded", {
        date,
        dayOfWeek,
        periodIndex: pIdx,
        periodRef: periodRef || `Period ${pIdx}`,
        availableTeachers: suggestions,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/substitutions/periods-needing-cover?date=
 * Checks approved teacher leaves on date and retrieves their timetable periods that lack a substitute.
 */
const getPeriodsNeedingCover = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDateStr = date || new Date().toISOString().split("T")[0];
    const targetDate = new Date(targetDateStr + "T00:00:00");
    const dayOfWeek = DAY_NAMES[targetDate.getDay()];
    const schoolId = req.user.schoolId;

    // Find teachers on approved leave
    const leaves = await LeaveRequest.find({
      schoolId,
      status: "approved",
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate },
    })
      .select("applicantId reason")
      .lean();

    const leaveUserIds = leaves.map((l) => l.applicantId);
    const absentTeachers = await Teacher.find({
      userId: { $in: leaveUserIds },
    })
      .populate("userId", "name email")
      .lean();

    const periodsNeedingCover = [];

    for (const teacher of absentTeachers) {
      // Find teacher's timetable slots on this day
      const slots = await Timetable.find({
        schoolId,
        teacherId: teacher._id,
        day: dayOfWeek,
      })
        .populate("classId", "className section")
        .sort({ periodIndex: 1 })
        .lean();

      for (const slot of slots) {
        const periodRef = slot.periodLabel || `Period ${slot.periodIndex}`;

        // Check if already assigned
        const existing = await SubstituteAssignment.findOne({
          date: targetDateStr,
          periodRef,
          classId: slot.classId?._id,
          status: { $ne: "cancelled" },
        })
          .populate({
            path: "substituteTeacherId",
            populate: { path: "userId", select: "name" },
          })
          .lean();

        periodsNeedingCover.push({
          date: targetDateStr,
          day: dayOfWeek,
          periodIndex: slot.periodIndex,
          periodRef,
          classId: slot.classId?._id,
          className: slot.classId
            ? `${slot.classId.className} - ${slot.classId.section}`
            : "-",
          subject: slot.subject,
          absentTeacherId: teacher._id,
          absentTeacherName: teacher.userId?.name || "Teacher",
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAssigned: !!existing,
          currentAssignment: existing
            ? {
                _id: existing._id,
                substituteName: existing.substituteTeacherId?.userId?.name || "Assigned",
                status: existing.status,
              }
            : null,
        });
      }
    }

    return res.status(200).json(
      ApiResponse.success(200, "Periods needing cover loaded", {
        date: targetDateStr,
        dayOfWeek,
        periods: periodsNeedingCover,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/substitutions
 * Assign a substitute and notify the teacher.
 */
const createSubstitution = async (req, res, next) => {
  try {
    const {
      date,
      periodRef,
      classId,
      subject,
      absentTeacherId,
      substituteTeacherId,
      notes,
    } = req.body;

    if (!date || !periodRef || !classId || !absentTeacherId || !substituteTeacherId) {
      throw new ApiError(400, "Missing required substitution details");
    }

    const schoolId = req.user.schoolId;

    // Check unique slot conflict
    const existing = await SubstituteAssignment.findOne({
      date,
      periodRef,
      classId,
      status: { $ne: "cancelled" },
    });

    if (existing) {
      throw new ApiError(
        409,
        `A substitute is already active for this class on ${date} (${periodRef}).`
      );
    }

    const assignment = await SubstituteAssignment.create({
      schoolId,
      date,
      periodRef,
      classId,
      subject: subject || "General",
      absentTeacherId,
      substituteTeacherId,
      notes: notes || "",
      status: "assigned",
      createdBy: req.user.id,
    });

    // Populate for response & notification
    const populated = await SubstituteAssignment.findById(assignment._id)
      .populate("classId", "className section")
      .populate({
        path: "substituteTeacherId",
        populate: { path: "userId", select: "_id name email" },
      })
      .populate({
        path: "absentTeacherId",
        populate: { path: "userId", select: "name" },
      })
      .lean();

    // Notify substitute teacher
    const subUser = populated.substituteTeacherId?.userId;
    if (subUser?._id) {
      const clsName = populated.classId
        ? `${populated.classId.className} - ${populated.classId.section}`
        : "Class";

      await notify(subUser._id, {
        type: "substitution_assigned",
        title: `📋 Substitution Assigned: ${clsName} (${periodRef})`,
        message: `You have been assigned to cover ${subject} for ${clsName} on ${date} during ${periodRef}, covering for ${
          populated.absentTeacherId?.userId?.name || "Colleague"
        }.`,
        data: {
          assignmentId: assignment._id,
          date,
          periodRef,
          className: clsName,
          subject,
        },
        sendEmailFlag: true,
        schoolId,
      }).catch((err) =>
        console.warn("[Substitution] Failed to notify teacher:", err.message)
      );
    }

    return res
      .status(201)
      .json(ApiResponse.success(201, "Substitute assigned successfully", populated));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/substitutions?date=
 */
const getSubstitutionsByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const query = { schoolId: req.user.schoolId };
    if (date) query.date = date;

    const list = await SubstituteAssignment.find(query)
      .populate("classId", "className section")
      .populate({
        path: "absentTeacherId",
        populate: { path: "userId", select: "name email" },
      })
      .populate({
        path: "substituteTeacherId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("createdBy", "name role")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res
      .status(200)
      .json(ApiResponse.success(200, "Substitutions retrieved successfully", list));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/substitutions/:id/cancel
 */
const cancelSubstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await SubstituteAssignment.findById(id);
    if (!assignment) throw new ApiError(404, "Assignment not found");

    assignment.status = "cancelled";
    await assignment.save();

    return res
      .status(200)
      .json(ApiResponse.success(200, "Substitution assignment cancelled", assignment));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubstitutionSuggestions,
  getPeriodsNeedingCover,
  createSubstitution,
  getSubstitutionsByDate,
  cancelSubstitution,
};
