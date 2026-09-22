const { z } = require("zod");
const School = require("../models/School.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const schoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters").trim(),
  address: z.string().optional().nullable(),
  contactEmail: z.string().email("Invalid email").optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/schools
 */
const listSchools = async (req, res, next) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, schools, "Schools fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/schools/:id
 */
const getSchool = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) throw new ApiError(404, "School not found.");
    return res.status(200).json(new ApiResponse(200, school, "School fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/schools
 */
const createSchool = async (req, res, next) => {
  try {
    const parsed = schoolSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const school = await School.create(parsed.data);
    return res.status(201).json(new ApiResponse(201, school, "School created successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/schools/:id
 */
const updateSchool = async (req, res, next) => {
  try {
    const parsed = schoolSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const updated = await School.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new ApiError(404, "School not found.");

    return res.status(200).json(new ApiResponse(200, updated, "School updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/schools/:id
 */
const deleteSchool = async (req, res, next) => {
  try {
    const school = await School.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!school) throw new ApiError(404, "School not found.");
    return res.status(200).json(new ApiResponse(200, null, "School deactivated successfully."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
};
