const SalaryStructure = require("../models/SalaryStructure.model");
const User = require("../models/User.model");
const auditLog = require("../utils/auditLog");
const { ApiError, ApiResponse } = require("../utils/apiResponse");

/**
 * GET /api/salary-structures
 * List all salary structures for the school.
 */
const getSalaryStructures = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { role, isActive, search } = req.query;

    const query = { schoolId };
    if (role) query.staffRole = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    let structures = await SalaryStructure.find(query)
      .populate("staffUserId", "name email role phone")
      .sort({ createdAt: -1 })
      .lean();

    if (search) {
      const q = search.toLowerCase();
      structures = structures.filter(
        (s) =>
          s.staffUserId?.name?.toLowerCase().includes(q) ||
          s.staffUserId?.email?.toLowerCase().includes(q) ||
          s.staffRole?.toLowerCase().includes(q)
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, structures, "Salary structures fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/salary-structures/staff-users
 * Returns list of eligible staff users (teachers, accountants, etc.) in the school
 * who can have salary structures.
 */
const getEligibleStaffUsers = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const staff = await User.find({
      schoolId,
      role: { $in: ["teacher", "accountant", "admin"] },
      isActive: true,
    })
      .select("_id name email role phone")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json(new ApiResponse(200, staff, "Staff users fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/salary-structures/:id
 * Get single salary structure by ID.
 */
const getSalaryStructureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const structure = await SalaryStructure.findOne({
      _id: id,
      schoolId: req.user.schoolId,
    }).populate("staffUserId", "name email role phone");

    if (!structure) {
      throw new ApiError(404, "Salary structure not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, structure, "Salary structure fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/salary-structures
 * Create a new salary structure.
 */
const createSalaryStructure = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { staffUserId, staffRole, basic, allowances, deductions, effectiveFrom } = req.body;

    if (!staffUserId) throw new ApiError(400, "Staff user ID is required");
    if (basic === undefined || basic === null || Number(basic) < 0) {
      throw new ApiError(400, "Valid basic salary in paise is required");
    }

    // Verify staff exists and belongs to school
    const staffUser = await User.findOne({ _id: staffUserId, schoolId });
    if (!staffUser) throw new ApiError(404, "Staff user not found in this school");

    // Check if an active structure already exists
    const existing = await SalaryStructure.findOne({
      schoolId,
      staffUserId,
      isActive: true,
    });

    if (existing) {
      throw new ApiError(
        400,
        "An active salary structure already exists for this staff member. Deactivate or update the existing one."
      );
    }

    const structure = await SalaryStructure.create({
      schoolId,
      staffUserId,
      staffRole: staffRole || staffUser.role,
      basic: Math.round(Number(basic)),
      allowances: Array.isArray(allowances) ? allowances : [],
      deductions: Array.isArray(deductions) ? deductions : [],
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      isActive: true,
    });

    await auditLog({
      userId: req.user._id,
      action: "salary_structure_created",
      module: "payroll",
      targetId: structure._id,
      newValue: structure.toObject(),
      ip: req.ip,
    });

    const populated = await SalaryStructure.findById(structure._id).populate(
      "staffUserId",
      "name email role phone"
    );

    return res
      .status(201)
      .json(new ApiResponse(201, populated, "Salary structure created successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/salary-structures/:id
 * Update an existing salary structure.
 */
const updateSalaryStructure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { staffRole, basic, allowances, deductions, effectiveFrom, isActive } = req.body;

    const structure = await SalaryStructure.findOne({ _id: id, schoolId });
    if (!structure) throw new ApiError(404, "Salary structure not found");

    const oldValue = structure.toObject();

    if (staffRole) structure.staffRole = staffRole;
    if (basic !== undefined && basic !== null) structure.basic = Math.round(Number(basic));
    if (Array.isArray(allowances)) structure.allowances = allowances;
    if (Array.isArray(deductions)) structure.deductions = deductions;
    if (effectiveFrom) structure.effectiveFrom = new Date(effectiveFrom);
    if (isActive !== undefined) structure.isActive = Boolean(isActive);

    await structure.save();

    await auditLog({
      userId: req.user._id,
      action: "salary_structure_updated",
      module: "payroll",
      targetId: structure._id,
      oldValue,
      newValue: structure.toObject(),
      ip: req.ip,
    });

    const populated = await SalaryStructure.findById(structure._id).populate(
      "staffUserId",
      "name email role phone"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, populated, "Salary structure updated successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/salary-structures/:id
 * Soft delete / deactivate (no hard deletes).
 */
const deactivateSalaryStructure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const structure = await SalaryStructure.findOne({ _id: id, schoolId });
    if (!structure) throw new ApiError(404, "Salary structure not found");

    const oldValue = structure.toObject();
    structure.isActive = false;
    await structure.save();

    await auditLog({
      userId: req.user._id,
      action: "salary_structure_deactivated",
      module: "payroll",
      targetId: structure._id,
      oldValue,
      newValue: structure.toObject(),
      ip: req.ip,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, structure, "Salary structure deactivated successfully"));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSalaryStructures,
  getEligibleStaffUsers,
  getSalaryStructureById,
  createSalaryStructure,
  updateSalaryStructure,
  deactivateSalaryStructure,
};
