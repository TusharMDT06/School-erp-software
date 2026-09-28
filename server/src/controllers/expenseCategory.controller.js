const ExpenseCategory = require("../models/ExpenseCategory.model");
const { DEFAULT_EXPENSE_CATEGORIES } = require("../models/ExpenseCategory.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");

/**
 * Helper to seed default expense categories if school has none
 */
const seedDefaultCategories = async (schoolId) => {
  const count = await ExpenseCategory.countDocuments({ schoolId });
  if (count === 0) {
    const docs = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
      schoolId,
      name,
      isActive: true,
    }));
    await ExpenseCategory.insertMany(docs);
  }
};

/**
 * GET /api/expense-categories
 * List categories, seeding defaults if empty
 */
exports.getCategories = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    await seedDefaultCategories(schoolId);

    const { isActive } = req.query;
    const query = { schoolId };
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }

    const categories = await ExpenseCategory.find(query).sort({ name: 1 }).lean();
    res.status(200).json(new ApiResponse(200, categories, "Expense categories retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/expense-categories
 * Create custom category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { name } = req.body;

    if (!name || !name.trim()) {
      throw new ApiError(400, "Category name is required.");
    }

    // Check duplicate name
    const existing = await ExpenseCategory.findOne({
      schoolId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      throw new ApiError(400, `Category "${name.trim()}" already exists.`);
    }

    const category = await ExpenseCategory.create({
      schoolId,
      name: name.trim(),
      isActive: true,
    });

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_CATEGORY_CREATED",
      targetType: "ExpenseCategory",
      targetId: category._id,
      details: { name: category.name },
    });

    res.status(201).json(new ApiResponse(201, category, "Expense category created."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/expense-categories/:id
 * Update category name or status
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { name, isActive } = req.body;

    const category = await ExpenseCategory.findOne({ _id: id, schoolId });
    if (!category) throw new ApiError(404, "Category not found.");

    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_CATEGORY_UPDATED",
      targetType: "ExpenseCategory",
      targetId: category._id,
      details: { name: category.name, isActive: category.isActive },
    });

    res.status(200).json(new ApiResponse(200, category, "Expense category updated."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/expense-categories/:id
 * Soft-deactivate category (no hard delete)
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const category = await ExpenseCategory.findOne({ _id: id, schoolId });
    if (!category) throw new ApiError(404, "Category not found.");

    category.isActive = false;
    await category.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_CATEGORY_DEACTIVATED",
      targetType: "ExpenseCategory",
      targetId: category._id,
      details: { name: category.name },
    });

    res.status(200).json(new ApiResponse(200, category, "Category deactivated successfully."));
  } catch (err) {
    next(err);
  }
};
