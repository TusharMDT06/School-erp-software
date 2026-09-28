const FinanceSettings = require("../models/FinanceSettings.model");
const School = require("../models/School.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");

/**
 * GET /api/finance-settings
 * Returns (or auto-creates) finance settings for the user's school.
 */
exports.getFinanceSettings = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new ApiError(400, "No school associated with your account.");

    let settings = await FinanceSettings.findOne({ schoolId });

    if (!settings) {
      // Auto-create with defaults
      const school = await School.findById(schoolId).lean();
      settings = await FinanceSettings.create({
        schoolId,
        schoolDisplayName: school?.name || "",
        address: school?.address || "",
        phone: school?.contactPhone || "",
      });
    }

    res.status(200).json(new ApiResponse(200, settings, "Finance settings retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/finance-settings
 * Update finance settings. Only admin / principal.
 */
exports.updateFinanceSettings = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new ApiError(400, "No school associated with your account.");

    const allowedFields = [
      "schoolDisplayName", "address", "phone", "receiptPrefix",
      "upiId", "expenseApprovalThreshold", "refundApprovalRequired",
      "lateFee", "paidLeavesPerMonth",
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const old = await FinanceSettings.findOne({ schoolId }).lean();

    const settings = await FinanceSettings.findOneAndUpdate(
      { schoolId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    await auditLog({
      userId: req.user.id,
      action: "finance_settings_updated",
      module: "finance_settings",
      targetId: settings._id,
      oldValue: old,
      newValue: settings.toObject(),
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, settings, "Finance settings updated."));
  } catch (err) {
    next(err);
  }
};
