const { z } = require("zod");
const ClassSection = require("../models/ClassSection.model");
const Student = require("../models/Student.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createClassSchema = z.object({
  schoolId: z.string().min(1, "School ID is required"),
  className: z.string().min(1, "Class name is required").trim(),
  section: z.string().min(1, "Section is required").trim(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{2,4}$/, "Academic year format: 2025-26 or 2025-2026")
    .trim(),
  classTeacherId: z.string().optional().nullable(),
});

const updateClassSchema = createClassSchema.partial();

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/classes
// ══════════════════════════════════════════════════════════════════════════
const createClass = async (req, res, next) => {
  try {
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const { schoolId, className, section, academicYear, classTeacherId } =
      parsed.data;

    const classSection = await ClassSection.create({
      schoolId,
      className,
      section: section.toUpperCase(),
      academicYear,
      classTeacherId: classTeacherId || null,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, classSection, "Class created successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/classes
// ══════════════════════════════════════════════════════════════════════════
const listClasses = async (req, res, next) => {
  try {
    const {
      academicYear,
      schoolId,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    // Non-superadmin admins are scoped to their own school
    if (schoolId) filter.schoolId = schoolId;
    else if (req.user.schoolId) filter.schoolId = req.user.schoolId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ClassSection.countDocuments(filter);

    const classes = await ClassSection.find(filter)
      .populate("classTeacherId", "employeeId userId")
      .populate({
        path: "classTeacherId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ className: 1, section: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach student count per class
    const classIds = classes.map((c) => c._id);
    const counts = await Student.aggregate([
      { $match: { classId: { $in: classIds }, status: "active" } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const data = classes.map((c) => ({
      ...c.toObject(),
      studentCount: countMap[c._id.toString()] || 0,
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          data,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total,
        },
        "Classes fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/classes/:id
// ══════════════════════════════════════════════════════════════════════════
const getClass = async (req, res, next) => {
  try {
    const classSection = await ClassSection.findById(req.params.id)
      .populate("schoolId", "name")
      .populate({
        path: "classTeacherId",
        populate: { path: "userId", select: "name email phone" },
      });

    if (!classSection) {
      throw new ApiError(404, "Class not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, classSection, "Class fetched successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PUT /api/classes/:id
// ══════════════════════════════════════════════════════════════════════════
const updateClass = async (req, res, next) => {
  try {
    const parsed = updateClassSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const updates = { ...parsed.data };
    if (updates.section) updates.section = updates.section.toUpperCase();

    const classSection = await ClassSection.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!classSection) {
      throw new ApiError(404, "Class not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, classSection, "Class updated successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE /api/classes/:id
// ══════════════════════════════════════════════════════════════════════════
const deleteClass = async (req, res, next) => {
  try {
    const hasStudents = await Student.exists({
      classId: req.params.id,
      status: "active",
    });

    if (hasStudents) {
      throw new ApiError(
        409,
        "Cannot delete class with active students. Transfer students first."
      );
    }

    const classSection = await ClassSection.findByIdAndDelete(req.params.id);
    if (!classSection) {
      throw new ApiError(404, "Class not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Class deleted successfully."));
  } catch (err) {
    next(err);
  }
};

module.exports = { createClass, listClasses, getClass, updateClass, deleteClass };
