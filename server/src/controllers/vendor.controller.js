const Vendor = require("../models/Vendor.model");
const Expense = require("../models/Expense.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");

/**
 * POST /api/vendors
 * Create new vendor
 */
exports.createVendor = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { name, contactPerson, phone, email, address, gstin } = req.body;

    if (!name || !name.trim()) {
      throw new ApiError(400, "Vendor name is required.");
    }

    const vendor = await Vendor.create({
      schoolId,
      name: name.trim(),
      contactPerson: contactPerson?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim().toLowerCase() || "",
      address: address?.trim() || "",
      gstin: gstin?.trim().toUpperCase() || "",
      isActive: true,
    });

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "VENDOR_CREATED",
      targetType: "Vendor",
      targetId: vendor._id,
      details: { name: vendor.name },
    });

    res.status(201).json(new ApiResponse(201, vendor, "Vendor created successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vendors
 * List vendors with total paid per vendor
 */
exports.getVendors = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { search, isActive } = req.query;

    const query = { schoolId };
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { contactPerson: regex }, { phone: regex }, { email: regex }];
    }

    const vendors = await Vendor.find(query).sort({ name: 1 }).lean();

    // Aggregate total paid per vendor for this school
    const paidPerVendor = await Expense.aggregate([
      { $match: { schoolId, status: "paid", vendorId: { $ne: null } } },
      { $group: { _id: "$vendorId", totalPaid: { $sum: "$amount" } } },
    ]);

    const paidMap = {};
    paidPerVendor.forEach((p) => {
      paidMap[p._id.toString()] = p.totalPaid;
    });

    const vendorsWithTotals = vendors.map((v) => ({
      ...v,
      totalPaid: paidMap[v._id.toString()] || 0,
    }));

    res.status(200).json(new ApiResponse(200, vendorsWithTotals, "Vendors retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vendors/:id
 */
exports.getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const vendor = await Vendor.findOne({ _id: id, schoolId }).lean();
    if (!vendor) throw new ApiError(404, "Vendor not found.");

    // Get total paid
    const totalPaidAgg = await Expense.aggregate([
      { $match: { schoolId, vendorId: vendor._id, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        { ...vendor, totalPaid: totalPaidAgg[0]?.total || 0 },
        "Vendor details retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/vendors/:id
 */
exports.updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { name, contactPerson, phone, email, address, gstin, isActive } = req.body;

    const vendor = await Vendor.findOne({ _id: id, schoolId });
    if (!vendor) throw new ApiError(404, "Vendor not found.");

    if (name !== undefined) vendor.name = name.trim();
    if (contactPerson !== undefined) vendor.contactPerson = contactPerson.trim();
    if (phone !== undefined) vendor.phone = phone.trim();
    if (email !== undefined) vendor.email = email.trim().toLowerCase();
    if (address !== undefined) vendor.address = address.trim();
    if (gstin !== undefined) vendor.gstin = gstin.trim().toUpperCase();
    if (isActive !== undefined) vendor.isActive = Boolean(isActive);

    await vendor.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "VENDOR_UPDATED",
      targetType: "Vendor",
      targetId: vendor._id,
      details: { name: vendor.name, isActive: vendor.isActive },
    });

    res.status(200).json(new ApiResponse(200, vendor, "Vendor updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vendors/:id (Soft-deactivate only — NO HARD DELETE)
 */
exports.deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const vendor = await Vendor.findOne({ _id: id, schoolId });
    if (!vendor) throw new ApiError(404, "Vendor not found.");

    vendor.isActive = false;
    await vendor.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "VENDOR_DEACTIVATED",
      targetType: "Vendor",
      targetId: vendor._id,
      details: { name: vendor.name },
    });

    res.status(200).json(new ApiResponse(200, vendor, "Vendor deactivated successfully (no hard delete)."));
  } catch (err) {
    next(err);
  }
};
