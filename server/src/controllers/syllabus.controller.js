const SyllabusUnit = require("../models/SyllabusUnit.model");
const ClassSection = require("../models/ClassSection.model");
const Teacher = require("../models/Teacher.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");

/**
 * POST /api/syllabus/units
 * Teacher creates a new syllabus unit.
 */
const createUnit = async (req, res, next) => {
  try {
    const {
      classId,
      className,
      subject,
      academicYear,
      unitNo,
      title,
      topics = [],
      plannedStart,
      plannedEnd,
    } = req.body;

    if (!classId || !subject || !academicYear || !unitNo || !title) {
      throw new ApiError(400, "classId, subject, academicYear, unitNo, and title are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    const formattedClassName =
      className ||
      `${classSection.className}${classSection.section ? ` - ${classSection.section}` : ""}`;

    const unit = await SyllabusUnit.create({
      schoolId: classSection.schoolId,
      classId: classSection._id,
      className: formattedClassName,
      subject: subject.trim(),
      academicYear: academicYear.trim(),
      unitNo: Number(unitNo),
      title: title.trim(),
      topics: Array.isArray(topics)
        ? topics.map((t) => ({
            title: t.title?.trim() || "Untitled Topic",
            plannedHours: Number(t.plannedHours) || 1,
            status: t.status || "not_started",
            completedOn: t.status === "completed" ? (t.completedOn ? new Date(t.completedOn) : new Date()) : null,
            note: t.note || "",
          }))
        : [],
      plannedStart: plannedStart ? new Date(plannedStart) : null,
      plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
      teacherId: teacher._id,
    });

    res.status(201).json(new ApiResponse(201, unit, "Syllabus unit created successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/units
 * Get syllabus units filtered by classId and subject.
 */
const getUnits = async (req, res, next) => {
  try {
    const { classId, subject, academicYear } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (academicYear) filter.academicYear = academicYear;
    if (subject) {
      filter.subject = new RegExp(`^${subject.trim()}$`, "i");
    }

    // Role-based visibility
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id || req.user._id });
      if (teacher && !classId) {
        filter.teacherId = teacher._id;
      }
    }

    const units = await SyllabusUnit.find(filter)
      .populate("teacherId", "name employeeId")
      .sort({ unitNo: 1, createdAt: 1 });

    res.status(200).json(new ApiResponse(200, units, "Syllabus units fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/units/:id
 */
const getUnitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await SyllabusUnit.findById(id).populate("teacherId", "name employeeId");
    if (!unit) throw new ApiError(404, "Syllabus unit not found.");

    res.status(200).json(new ApiResponse(200, unit, "Syllabus unit fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/syllabus/units/:id
 * Teacher updates unit details or topic list.
 */
const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await SyllabusUnit.findById(id);
    if (!unit) throw new ApiError(404, "Syllabus unit not found.");

    // Enforce ownership
    await assertTeacherOwnsClassSubject(req.user, unit.classId, unit.subject);

    const {
      unitNo,
      title,
      topics,
      plannedStart,
      plannedEnd,
      academicYear,
    } = req.body;

    if (unitNo !== undefined) unit.unitNo = Number(unitNo);
    if (title !== undefined) unit.title = title.trim();
    if (academicYear !== undefined) unit.academicYear = academicYear.trim();
    if (plannedStart !== undefined) unit.plannedStart = plannedStart ? new Date(plannedStart) : null;
    if (plannedEnd !== undefined) unit.plannedEnd = plannedEnd ? new Date(plannedEnd) : null;

    if (Array.isArray(topics)) {
      unit.topics = topics.map((t) => ({
        title: t.title?.trim() || "Untitled Topic",
        plannedHours: Number(t.plannedHours) || 1,
        status: t.status || "not_started",
        completedOn: t.status === "completed" ? (t.completedOn ? new Date(t.completedOn) : new Date()) : null,
        note: t.note || "",
      }));
    }

    await unit.save();

    res.status(200).json(new ApiResponse(200, unit, "Syllabus unit updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/syllabus/units/:id
 */
const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await SyllabusUnit.findById(id);
    if (!unit) throw new ApiError(404, "Syllabus unit not found.");

    await assertTeacherOwnsClassSubject(req.user, unit.classId, unit.subject);

    await SyllabusUnit.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, "Syllabus unit deleted successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/syllabus/units/:id/topics/:topicId
 * Mark topic status (not_started, in_progress, completed) and optional note.
 */
const updateTopicStatus = async (req, res, next) => {
  try {
    const { id, topicId } = req.params;
    const { status, note, completedOn } = req.body;

    const unit = await SyllabusUnit.findById(id);
    if (!unit) throw new ApiError(404, "Syllabus unit not found.");

    await assertTeacherOwnsClassSubject(req.user, unit.classId, unit.subject);

    const topic = unit.topics.id(topicId);
    if (!topic) throw new ApiError(404, "Topic not found within this unit.");

    if (status) {
      if (!["not_started", "in_progress", "completed"].includes(status)) {
        throw new ApiError(400, "Invalid topic status.");
      }
      topic.status = status;
      if (status === "completed") {
        topic.completedOn = completedOn ? new Date(completedOn) : new Date();
      } else {
        topic.completedOn = null;
      }
    }

    if (note !== undefined) {
      topic.note = note.trim();
    }

    await unit.save();

    res.status(200).json(new ApiResponse(200, unit, "Topic status updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/progress?classId=&subject=
 * Calculates syllabus completion % and checks behind schedule flag.
 * Readable by owning teacher, principal, admin.
 */
const getSyllabusProgress = async (req, res, next) => {
  try {
    const { classId, subject } = req.query;

    if (!classId || !subject) {
      throw new ApiError(400, "classId and subject query params are required.");
    }

    // Role check: teacher must have access or principal/admin
    if (req.user.role === "teacher") {
      await assertTeacherOwnsClassSubject(req.user, classId, subject);
    } else if (!["admin", "superadmin", "principal"].includes(req.user.role)) {
      throw new ApiError(403, "Access denied. Insufficient permissions.");
    }

    const units = await SyllabusUnit.find({
      classId,
      subject: new RegExp(`^${subject.trim()}$`, "i"),
    }).sort({ unitNo: 1 });

    const now = new Date();
    let totalPlannedHours = 0;
    let completedHours = 0;
    let totalTopics = 0;
    let completedTopics = 0;
    const behindUnits = [];

    for (const unit of units) {
      let unitPlannedHours = 0;
      let unitCompletedHours = 0;
      let allTopicsDone = unit.topics.length > 0;

      for (const topic of unit.topics) {
        totalTopics += 1;
        const hours = topic.plannedHours || 1;
        totalPlannedHours += hours;
        unitPlannedHours += hours;

        if (topic.status === "completed") {
          completedTopics += 1;
          completedHours += hours;
          unitCompletedHours += hours;
        } else {
          allTopicsDone = false;
        }
      }

      // Check if unit is past plannedEnd and not completed
      const isPastEnd = unit.plannedEnd && new Date(unit.plannedEnd) < now;
      const isBehind = isPastEnd && (!allTopicsDone || unitCompletedHours < unitPlannedHours);

      if (isBehind) {
        behindUnits.push({
          unitId: unit._id,
          unitNo: unit.unitNo,
          title: unit.title,
          plannedEnd: unit.plannedEnd,
          plannedHours: unitPlannedHours,
          completedHours: unitCompletedHours,
        });
      }
    }

    const completionPercentage =
      totalPlannedHours > 0
        ? Math.round((completedHours / totalPlannedHours) * 100)
        : 0;

    const isBehindSchedule = behindUnits.length > 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          classId,
          subject,
          totalUnits: units.length,
          totalTopics,
          completedTopics,
          totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
          completedHours: Number(completedHours.toFixed(1)),
          completionPercentage,
          isBehindSchedule,
          behindUnitsCount: behindUnits.length,
          behindUnits,
        },
        "Syllabus progress calculated successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
  updateTopicStatus,
  getSyllabusProgress,
};
