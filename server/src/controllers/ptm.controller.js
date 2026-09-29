const mongoose = require("mongoose");
const PTMEvent = require("../models/PTMEvent.model");
const PTMSlot = require("../models/PTMSlot.model");
const Teacher = require("../models/Teacher.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const Attendance = require("../models/Attendance.model");
const Result = require("../models/Result.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const StudentRemark = require("../models/StudentRemark.model");
const StudentRisk = require("../models/StudentRisk.model");
const AcademicEvent = require("../models/AcademicEvent.model");
const { notify } = require("../services/notification.service");
const { ApiError, ApiResponse } = require("../utils/apiResponse");

// Helper to convert HH:mm to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes from midnight to HH:mm
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/**
 * POST /api/ptm
 * Principal / Admin creates PTM event and generates slots for relevant teachers.
 */
const createPTMEvent = async (req, res, next) => {
  try {
    const {
      title,
      date,
      startTime,
      endTime,
      slotMinutes = 10,
      classIds = [],
      bookingClosesAt,
      status = "open",
    } = req.body;

    if (!title || !date || !startTime || !endTime) {
      throw new ApiError(400, "Title, date, startTime, and endTime are required.");
    }

    if (!classIds || classIds.length === 0) {
      throw new ApiError(400, "Please select at least one class for the PTM.");
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      throw new ApiError(400, "End time must be after start time.");
    }
    if (slotMinutes <= 0 || slotMinutes > 60) {
      throw new ApiError(400, "Slot duration must be between 5 and 60 minutes.");
    }

    const schoolId = req.user.schoolId;

    // 1. Create PTM Event
    const ptmEvent = await PTMEvent.create({
      schoolId,
      title,
      date: new Date(date),
      startTime,
      endTime,
      slotMinutes: Number(slotMinutes),
      classIds,
      bookingClosesAt: bookingClosesAt ? new Date(bookingClosesAt) : null,
      status,
      createdBy: req.user._id,
    });

    // 2. Identify relevant teachers (class teacher + subject teachers)
    const classes = await ClassSection.find({ _id: { $in: classIds } }).select("classTeacherId");
    const classTeacherIds = classes
      .map((c) => c.classTeacherId)
      .filter((id) => id);

    const subjectTeachers = await Teacher.find({
      assignedClasses: { $in: classIds },
    }).select("_id");
    const subjectTeacherIds = subjectTeachers.map((t) => t._id);

    // Merge unique teacher IDs
    const teacherIdSet = new Set([
      ...classTeacherIds.map((id) => id.toString()),
      ...subjectTeacherIds.map((id) => id.toString()),
    ]);
    const teacherIds = Array.from(teacherIdSet).map((id) => new mongoose.Types.ObjectId(id));

    // 3. Generate slots
    const slotsToInsert = [];
    for (const tId of teacherIds) {
      let currentMin = startMin;
      while (currentMin + Number(slotMinutes) <= endMin) {
        const slotStart = minutesToTime(currentMin);
        const slotEnd = minutesToTime(currentMin + Number(slotMinutes));

        slotsToInsert.push({
          ptmId: ptmEvent._id,
          teacherId: tId,
          startTime: slotStart,
          endTime: slotEnd,
          status: "open",
        });

        currentMin += Number(slotMinutes);
      }
    }

    if (slotsToInsert.length > 0) {
      await PTMSlot.insertMany(slotsToInsert);
    }

    // 4. Calendar Hook: create AcademicEvent (type: "ptm") if model exists
    try {
      if (AcademicEvent) {
        const dateStr = new Date(date).toISOString().split("T")[0];
        await AcademicEvent.create({
          schoolId,
          title: `PTM: ${title}`,
          description: `Parent-Teacher Meeting for selected classes`,
          type: "ptm",
          startDate: new Date(`${dateStr}T${startTime}:00`),
          endDate: new Date(`${dateStr}T${endTime}:00`),
          audience: "class_specific",
          classIds,
          status: status === "draft" ? "draft" : "published",
        });
      }
    } catch (calErr) {
      console.warn("[PTM Calendar Hook Error]:", calErr.message);
    }

    return res.status(201).json(
      new ApiResponse(201, {
        ptmEvent,
        teachersCount: teacherIds.length,
        slotsGenerated: slotsToInsert.length,
      }, "PTM event created and slots generated successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ptm
 * List PTM events with optional filters.
 */
const getPTMEvents = async (req, res, next) => {
  try {
    const { status, classId } = req.query;
    const filter = { schoolId: req.user.schoolId };

    if (status) {
      filter.status = status;
    }

    if (classId) {
      filter.classIds = classId;
    }

    // If parent, show events relevant to their children
    if (req.user.role === "parent") {
      const children = await Student.find({ guardianIds: req.user._id }).select("classId");
      const childClassIds = children.map((c) => c.classId);
      filter.classIds = { $in: childClassIds };
      if (!status) {
        filter.status = { $in: ["open", "closed"] };
      }
    }

    const events = await PTMEvent.find(filter)
      .populate("classIds", "className section")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .lean();

    // Attach slot stats for each event
    const eventIds = events.map((e) => e._id);
    const slotStats = await PTMSlot.aggregate([
      { $match: { ptmId: { $in: eventIds } } },
      {
        $group: {
          _id: "$ptmId",
          totalSlots: { $sum: 1 },
          bookedSlots: {
            $sum: { $cond: [{ $in: ["$status", ["booked", "completed"]] }, 1, 0] },
          },
          openSlots: {
            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map();
    slotStats.forEach((s) => statsMap.set(s._id.toString(), s));

    const enrichedEvents = events.map((e) => ({
      ...e,
      totalSlots: statsMap.get(e._id.toString())?.totalSlots || 0,
      bookedSlots: statsMap.get(e._id.toString())?.bookedSlots || 0,
      openSlots: statsMap.get(e._id.toString())?.openSlots || 0,
    }));

    return res.status(200).json(new ApiResponse(200, enrichedEvents, "PTM events retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ptm/:id
 * Retrieve single PTM event with relevant teachers list.
 */
const getPTMEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await PTMEvent.findById(id)
      .populate("classIds", "className section")
      .populate("createdBy", "name")
      .lean();

    if (!event) {
      throw new ApiError(404, "PTM event not found.");
    }

    // Get list of teachers participating in this event
    const distinctTeacherIds = await PTMSlot.distinct("teacherId", { ptmId: id });
    const teachers = await Teacher.find({ _id: { $in: distinctTeacherIds } })
      .populate("userId", "name email phone")
      .select("_id userId subjects assignedClasses")
      .lean();

    return res.status(200).json(
      new ApiResponse(200, { event, teachers }, "PTM event details retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ptm/:id/slots?teacherId=
 * Slots query for booking / inspection.
 */
const getSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.query;

    const filter = { ptmId: id };
    if (teacherId) {
      filter.teacherId = teacherId;
    }

    const slots = await PTMSlot.find(filter)
      .populate({
        path: "teacherId",
        select: "_id subjects userId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("studentId", "name rollNumber admissionNumber classId")
      .sort({ startTime: 1 })
      .lean();

    // Privacy formatting for parents
    const sanitizedSlots = slots.map((slot) => {
      const isParent = req.user.role === "parent";
      const isMyBooking =
        isParent &&
        slot.parentUserId &&
        slot.parentUserId.toString() === req.user._id.toString();

      if (isParent && !isMyBooking && slot.status === "booked") {
        return {
          _id: slot._id,
          ptmId: slot.ptmId,
          teacherId: slot.teacherId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "booked", // hide other parent/student details
        };
      }

      return {
        ...slot,
        isMyBooking,
      };
    });

    return res.status(200).json(new ApiResponse(200, sanitizedSlots, "PTM slots retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ptm/slots/:id/book
 * Atomic booking of an open slot.
 */
const bookSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      throw new ApiError(400, "Student ID is required to book a slot.");
    }

    // 1. Verify student exists and belongs to parent (or admin)
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    if (req.user.role === "parent") {
      const isParent = student.guardianIds?.some(
        (gId) => gId.toString() === req.user._id.toString()
      );
      if (!isParent) {
        throw new ApiError(403, "You can only book appointments for your registered children.");
      }
    }

    // 2. Fetch slot & event
    const targetSlot = await PTMSlot.findById(id).populate("teacherId");
    if (!targetSlot) {
      throw new ApiError(404, "PTM slot not found.");
    }

    const ptmEvent = await PTMEvent.findById(targetSlot.ptmId);
    if (!ptmEvent) {
      throw new ApiError(404, "PTM event not found.");
    }

    if (ptmEvent.status !== "open") {
      throw new ApiError(400, `Booking is ${ptmEvent.status} for this PTM.`);
    }

    if (ptmEvent.bookingClosesAt && new Date() > new Date(ptmEvent.bookingClosesAt)) {
      throw new ApiError(400, "Booking deadline has passed for this PTM event.");
    }

    // 3. Verify student's class is included in the PTM event
    const classIncluded = ptmEvent.classIds.some(
      (cId) => cId.toString() === student.classId.toString()
    );
    if (!classIncluded) {
      throw new ApiError(400, "This PTM event does not cover this student's class.");
    }

    // 4. Enforce one slot per teacher per child
    const existingBooking = await PTMSlot.findOne({
      ptmId: targetSlot.ptmId,
      teacherId: targetSlot.teacherId._id,
      studentId: student._id,
      status: { $nin: ["cancelled", "open"] },
    });

    if (existingBooking) {
      throw new ApiError(
        400,
        "You already have a booked slot with this teacher for this child in this PTM."
      );
    }

    // 5. ATOMIC BOOKING: findOneAndUpdate({ _id, status: "open" })
    const bookedSlot = await PTMSlot.findOneAndUpdate(
      { _id: id, status: "open" },
      {
        status: "booked",
        parentUserId: req.user._id,
        studentId: student._id,
        bookedAt: new Date(),
      },
      { new: true }
    )
      .populate("teacherId")
      .populate("studentId", "name admissionNumber rollNumber");

    if (!bookedSlot) {
      throw new ApiError(409, "Slot just taken by another parent. Please choose another time slot.");
    }

    // 6. Notify teacher
    try {
      const teacher = await Teacher.findById(targetSlot.teacherId._id);
      if (teacher?.userId) {
        await notify(teacher.userId, {
          type: "ptm_booked",
          title: "New PTM Slot Booked",
          message: `Slot booked for ${student.name} from ${bookedSlot.startTime} to ${bookedSlot.endTime} on ${new Date(ptmEvent.date).toLocaleDateString()}.`,
          data: { slotId: bookedSlot._id, ptmId: ptmEvent._id, studentId: student._id },
          sendEmail: true,
        });
      }
    } catch (notifErr) {
      console.warn("[PTM Booking Notify Error]:", notifErr.message);
    }

    return res.status(200).json(
      new ApiResponse(200, bookedSlot, "PTM slot booked successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/ptm/slots/:id/cancel
 * Cancel booked slot (Parent >= 6h, Teacher anytime with reason).
 */
const cancelSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = "" } = req.body;

    const slot = await PTMSlot.findById(id).populate("teacherId");
    if (!slot) {
      throw new ApiError(404, "Slot not found.");
    }

    if (slot.status !== "booked") {
      throw new ApiError(400, `Cannot cancel slot with status "${slot.status}".`);
    }

    const event = await PTMEvent.findById(slot.ptmId);
    if (!event) {
      throw new ApiError(404, "PTM event not found.");
    }

    const isParent = req.user.role === "parent";
    const isTeacher = req.user.role === "teacher";
    const isAdmin = ["admin", "principal", "superadmin"].includes(req.user.role);

    if (isParent) {
      if (slot.parentUserId?.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to cancel this slot.");
      }

      // Check 6-hour advance requirement
      const eventDateStr = new Date(event.date).toISOString().split("T")[0];
      const slotStartTime = new Date(`${eventDateStr}T${slot.startTime}:00`);
      const hoursUntilSlot = (slotStartTime.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilSlot < 6) {
        throw new ApiError(
          400,
          "Parents can only cancel appointments at least 6 hours prior to the slot."
        );
      }
    } else if (isTeacher) {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || slot.teacherId._id.toString() !== teacher._id.toString()) {
        throw new ApiError(403, "You can only cancel your own appointments.");
      }
      if (!reason.trim()) {
        throw new ApiError(400, "Teacher must provide a cancellation reason.");
      }
    } else if (!isAdmin) {
      throw new ApiError(403, "Unauthorized to cancel this slot.");
    }

    const previousParentId = slot.parentUserId;
    const previousStudentId = slot.studentId;

    // Slot reopens
    slot.status = "open";
    slot.parentUserId = null;
    slot.studentId = null;
    slot.bookedAt = null;
    await slot.save();

    // Notify the other party
    try {
      if (isParent) {
        // Notify teacher
        const teacher = await Teacher.findById(slot.teacherId._id);
        if (teacher?.userId) {
          await notify(teacher.userId, {
            type: "ptm_cancelled",
            title: "PTM Slot Cancelled by Parent",
            message: `Parent cancelled appointment for slot ${slot.startTime} - ${slot.endTime}. The slot is now open for other parents.`,
            data: { slotId: slot._id, ptmId: event._id },
          });
        }
      } else {
        // Notify parent
        if (previousParentId) {
          await notify(previousParentId, {
            type: "ptm_cancelled",
            title: "PTM Appointment Cancelled by Teacher",
            message: `Your PTM slot (${slot.startTime} - ${slot.endTime}) was cancelled by the teacher. Reason: ${reason || "Unforeseen schedule conflict"}. You may rebook another available slot.`,
            data: { slotId: slot._id, ptmId: event._id, reason },
            sendEmail: true,
          });
        }
      }
    } catch (notifErr) {
      console.warn("[PTM Cancellation Notify Error]:", notifErr.message);
    }

    return res.status(200).json(
      new ApiResponse(200, slot, "Slot cancelled and reopened successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teacher/ptm/agenda?ptmId=
 * Teacher agenda: booked slots in time order with student quick profile (NO fee data).
 */
const getTeacherAgenda = async (req, res, next) => {
  try {
    const { ptmId } = req.query;

    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      throw new ApiError(404, "Teacher profile not found.");
    }

    const filter = {
      teacherId: teacher._id,
      status: { $in: ["booked", "completed", "no_show"] },
    };

    if (ptmId) {
      filter.ptmId = ptmId;
    }

    const slots = await PTMSlot.find(filter)
      .populate("ptmId", "title date startTime endTime status")
      .populate({
        path: "studentId",
        select: "_id name rollNumber admissionNumber classId guardianIds",
        populate: { path: "classId", select: "className section" },
      })
      .populate("parentUserId", "name email phone")
      .sort({ startTime: 1 })
      .lean();

    // Enrich each slot with student quick profile
    const enrichedSlots = await Promise.all(
      slots.map(async (slot) => {
        if (!slot.studentId) return slot;

        const studentId = slot.studentId._id;
        const classId = slot.studentId.classId?._id;

        // 1. Attendance %
        const totalAttendance = await Attendance.countDocuments({ studentId });
        const presentCount = await Attendance.countDocuments({
          studentId,
          status: { $in: ["present", "late"] },
        });
        const attendancePercentage =
          totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

        // 2. Latest Exam Result %
        const latestResult = await Result.findOne({ studentId })
          .sort({ createdAt: -1 })
          .populate("examId", "name")
          .lean();

        // 3. Homework Completion %
        let homeworkCompletionRate = 100;
        if (classId) {
          const totalHomeworks = await Homework.countDocuments({ classId, status: "assigned" });
          if (totalHomeworks > 0) {
            const submissionsCount = await HomeworkSubmission.countDocuments({ studentId });
            homeworkCompletionRate = Math.min(
              100,
              Math.round((submissionsCount / totalHomeworks) * 100)
            );
          }
        }

        // 4. Recent Remarks
        const recentRemarks = await StudentRemark.find({ studentId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select("type text createdAt visibleToParent")
          .lean();

        // 5. Risk Band (NO fee data, non-finance reasons only)
        const riskRecord = await StudentRisk.findOne({ studentId }).lean();
        let riskProfile = null;
        if (riskRecord) {
          riskProfile = {
            band: riskRecord.band,
            score: riskRecord.score,
            // Filter out financial factors/reasons
            reasons: (riskRecord.reasons || []).filter(
              (r) => r.visibility !== "finance" && r.factor !== "fees"
            ),
          };
        }

        return {
          ...slot,
          studentQuickProfile: {
            attendancePercentage,
            latestResult: latestResult
              ? {
                  examName: latestResult.examId?.name || "Recent Exam",
                  percentage: latestResult.percentage,
                  grade: latestResult.grade,
                }
              : null,
            homeworkCompletionRate,
            recentRemarks,
            riskProfile,
            // Strictly NO fee records attached
          },
        };
      })
    );

    return res.status(200).json(
      new ApiResponse(200, enrichedSlots, "Teacher PTM agenda retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/ptm/slots/:id/complete
 * Complete slot: private notes, shared summary, action items, no-show toggle.
 */
const completeSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes = "", sharedSummary = "", actionItems = [], noShow = false } = req.body;

    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher && !["admin", "principal", "superadmin"].includes(req.user.role)) {
      throw new ApiError(403, "Only the assigned teacher or admin can complete a PTM slot.");
    }

    const slot = await PTMSlot.findById(id);
    if (!slot) {
      throw new ApiError(404, "PTM slot not found.");
    }

    if (
      teacher &&
      slot.teacherId.toString() !== teacher._id.toString() &&
      !["admin", "principal", "superadmin"].includes(req.user.role)
    ) {
      throw new ApiError(403, "You can only update your own PTM slots.");
    }

    slot.status = noShow ? "no_show" : "completed";
    slot.notes = notes; // private to teacher
    slot.sharedSummary = sharedSummary; // visible to parent
    slot.actionItems = Array.isArray(actionItems) ? actionItems : [];
    await slot.save();

    // If shared summary added, notify parent
    if (sharedSummary.trim() && slot.parentUserId && !noShow) {
      try {
        await notify(slot.parentUserId, {
          type: "general",
          title: "PTM Discussion Summary Available",
          message: `Your child's teacher has posted the summary and action items from your meeting.`,
          data: { slotId: slot._id, ptmId: slot.ptmId },
        });
      } catch (notifErr) {
        console.warn("[PTM Complete Notify Error]:", notifErr.message);
      }
    }

    return res.status(200).json(
      new ApiResponse(200, slot, "PTM slot marked as completed.")
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPTMEvent,
  getPTMEvents,
  getPTMEventById,
  getSlots,
  bookSlot,
  cancelSlot,
  getTeacherAgenda,
  completeSlot,
};
