const Joi = require("joi");
const AdmissionInquiry = require("../models/AdmissionInquiry.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const School = require("../models/School.model");
const User = require("../models/User.model");
const { notify } = require("../services/notification.service");
const { auditLog } = require("../utils/auditLog");

// ── Validation Schemas ───────────────────────────────────────────────────────
const publicInquirySchema = Joi.object({
  schoolId: Joi.string().optional().allow(""),
  childName: Joi.string().trim().min(2).max(100).required(),
  dob: Joi.date().iso().optional().allow(null, ""),
  applyingForClass: Joi.string().trim().required(),
  parentName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(7).max(16).required(),
  email: Joi.string().trim().email().optional().allow(""),
  source: Joi.string()
    .valid("walk_in", "phone", "website", "referral", "social_media", "other")
    .default("website"),
  referredBy: Joi.string().trim().allow("").optional(),
  notes: Joi.string().trim().allow("").optional(),
  website_hp: Joi.string().allow("").optional(), // Honeypot trap
});

const inquirySchema = Joi.object({
  childName: Joi.string().trim().min(2).max(100).required(),
  dob: Joi.date().iso().optional().allow(null, ""),
  applyingForClass: Joi.string().trim().required(),
  parentName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(7).max(16).required(),
  email: Joi.string().trim().email().optional().allow(""),
  source: Joi.string()
    .valid("walk_in", "phone", "website", "referral", "social_media", "other")
    .default("walk_in"),
  referredBy: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(
      "new",
      "contacted",
      "visit_scheduled",
      "visited",
      "application_submitted",
      "documents_pending",
      "admitted",
      "rejected",
      "lost"
    )
    .default("new"),
  assignedTo: Joi.string().optional().allow(null, ""),
  nextFollowUpAt: Joi.date().iso().optional().allow(null, ""),
  notes: Joi.string().trim().allow("").optional(),
});

// ── Helper: Assign Admin Staff (Round-Robin / Least Loaded) ──────────────────
async function getRoundRobinAssignee(schoolId) {
  try {
    const adminStaff = await User.find({
      schoolId,
      role: { $in: ["admin", "superadmin"] },
      isActive: true,
    })
      .select("_id name email")
      .lean();

    if (!adminStaff || adminStaff.length === 0) return null;

    // Count open leads per staff member to balance load
    const counts = await Promise.all(
      adminStaff.map(async (staff) => {
        const count = await AdmissionInquiry.countDocuments({
          schoolId,
          assignedTo: staff._id,
          status: { $nin: ["admitted", "rejected", "lost"] },
        });
        return { staff, count };
      })
    );

    counts.sort((a, b) => a.count - b.count);
    return counts[0].staff._id;
  } catch (err) {
    console.warn("[Inquiry] Error getting assignee:", err.message);
    return null;
  }
}

// ── 1. PUBLIC "Enquire Now" Endpoint ─────────────────────────────────────────
exports.publicSubmitInquiry = async (req, res) => {
  try {
    // 1. Check Honeypot Field
    if (req.body.website_hp && req.body.website_hp.trim() !== "") {
      // Silently discard spam submission and return success
      return res.status(200).json({
        success: true,
        message: "Thank you for reaching out! Our admissions office will get in touch shortly.",
      });
    }

    // 2. Validate Input with Joi
    const { error, value } = publicInquirySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(", "),
      });
    }

    // 3. Resolve School ID
    let schoolId = value.schoolId;
    if (!schoolId) {
      const defaultSchool = await School.findOne({ isActive: true }).select("_id").lean();
      schoolId = defaultSchool?._id;
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "No active school found for inquiry." });
    }

    // 4. Assign staff round-robin
    const assigneeId = await getRoundRobinAssignee(schoolId);

    // 5. Initial follow-up note if provided
    const followUps = [];
    if (value.notes) {
      followUps.push({
        date: new Date(),
        mode: "website",
        notes: `Initial note from website inquiry: ${value.notes}`,
        by: assigneeId || schoolId,
      });
    }

    // 6. Create Inquiry
    const inquiry = await AdmissionInquiry.create({
      schoolId,
      childName: value.childName,
      dob: value.dob || null,
      applyingForClass: value.applyingForClass,
      parentName: value.parentName,
      phone: value.phone,
      email: value.email || "",
      source: value.source || "website",
      referredBy: value.referredBy || "",
      status: "new",
      followUps,
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default next day
      assignedTo: assigneeId,
    });

    // 7. Send acknowledgement email to parent if email provided
    if (value.email) {
      await notify(null, {
        type: "inquiry_acknowledged",
        title: "Admission Inquiry Acknowledged",
        message: `Thank you for your interest in admissions for ${value.childName}.`,
        data: {
          childName: value.childName,
          applyingForClass: value.applyingForClass,
        },
        sendEmailFlag: true,
        schoolId,
      });
    }

    // 8. Alert assignee if assigned
    if (assigneeId) {
      await notify(assigneeId, {
        type: "inquiry_assigned",
        title: "New Admission Inquiry Received",
        message: `New inquiry for ${value.childName} (Class: ${value.applyingForClass}) from ${value.parentName}.`,
        data: {
          inquiryId: inquiry._id,
          childName: value.childName,
          applyingForClass: value.applyingForClass,
          parentName: value.parentName,
          phone: value.phone,
        },
        sendEmailFlag: true,
        schoolId,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Thank you for reaching out! Our admissions office will get in touch shortly.",
      data: {
        id: inquiry._id,
        referenceNumber: inquiry._id.toString().slice(-6).toUpperCase(),
      },
    });
  } catch (err) {
    console.error("[publicSubmitInquiry Error]", err);
    return res.status(500).json({ success: false, message: "Failed to submit inquiry. Please try again." });
  }
};

// ── 2. Check Duplicate Inquiry by Phone ──────────────────────────────────────
exports.checkDuplicateInquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const cleanPhone = phone.trim();
    const existing = await AdmissionInquiry.findOne({
      schoolId,
      phone: cleanPhone,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existing) {
      return res.json({
        success: true,
        isDuplicate: true,
        existingInquiry: {
          id: existing._id,
          childName: existing.childName,
          parentName: existing.parentName,
          status: existing.status,
          createdAt: existing.createdAt,
        },
      });
    }

    return res.json({ success: true, isDuplicate: false });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 3. List Inquiries with Search & Filters ──────────────────────────────────
exports.getInquiries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      status,
      applyingForClass,
      assignedTo,
      source,
      search,
      overdueOnly,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { schoolId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (applyingForClass && applyingForClass !== "all") {
      query.applyingForClass = applyingForClass;
    }

    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = assignedTo;
    }

    if (source && source !== "all") {
      query.source = source;
    }

    if (overdueOnly === "true") {
      query.nextFollowUpAt = { $lte: new Date() };
      query.status = { $nin: ["admitted", "rejected", "lost"] };
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ childName: regex }, { parentName: regex }, { phone: regex }, { email: regex }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      AdmissionInquiry.find(query)
        .populate("assignedTo", "name email role")
        .populate("convertedStudentId", "firstName lastName admissionNumber rollNumber")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdmissionInquiry.countDocuments(query),
    ]);

    const now = new Date();
    const enriched = inquiries.map((item) => ({
      ...item,
      isOverdue:
        item.nextFollowUpAt &&
        new Date(item.nextFollowUpAt) < now &&
        !["admitted", "rejected", "lost"].includes(item.status),
    }));

    return res.json({
      success: true,
      data: {
        items: enriched,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 4. Create Inquiry (Internal) ─────────────────────────────────────────────
exports.createInquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { error, value } = inquirySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(", "),
      });
    }

    // Check duplicate by phone
    const existing = await AdmissionInquiry.findOne({
      schoolId,
      phone: value.phone,
      status: { $nin: ["admitted", "lost"] },
    }).lean();

    const followUps = [];
    if (value.notes) {
      followUps.push({
        date: new Date(),
        mode: "call",
        notes: value.notes,
        by: req.user._id,
      });
    }

    const inquiry = await AdmissionInquiry.create({
      schoolId,
      childName: value.childName,
      dob: value.dob || null,
      applyingForClass: value.applyingForClass,
      parentName: value.parentName,
      phone: value.phone,
      email: value.email || "",
      source: value.source || "walk_in",
      referredBy: value.referredBy || "",
      status: value.status || "new",
      followUps,
      nextFollowUpAt: value.nextFollowUpAt || null,
      assignedTo: value.assignedTo || req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Inquiry registered successfully.",
      data: inquiry,
      warnDuplicate: !!existing,
      existingId: existing?._id || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 5. Get Single Inquiry Detail ─────────────────────────────────────────────
exports.getInquiryById = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const inquiry = await AdmissionInquiry.findOne({
      _id: req.params.id,
      schoolId,
    })
      .populate("assignedTo", "name email role")
      .populate("followUps.by", "name role")
      .populate("convertedStudentId", "firstName lastName admissionNumber classId")
      .lean();

    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    return res.json({ success: true, data: inquiry });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 6. Log Follow-Up Note ────────────────────────────────────────────────────
exports.addFollowUp = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { mode, notes, nextFollowUpAt, status } = req.body;

    if (!notes || notes.trim() === "") {
      return res.status(400).json({ success: false, message: "Follow-up note is required." });
    }

    const inquiry = await AdmissionInquiry.findOne({ _id: req.params.id, schoolId });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    inquiry.followUps.push({
      date: new Date(),
      mode: mode || "call",
      notes: notes.trim(),
      by: req.user._id,
    });

    if (nextFollowUpAt) {
      inquiry.nextFollowUpAt = new Date(nextFollowUpAt);
    }

    if (status && status !== inquiry.status) {
      inquiry.status = status;
    } else if (inquiry.status === "new") {
      inquiry.status = "contacted";
    }

    await inquiry.save();

    return res.json({
      success: true,
      message: "Follow-up logged successfully.",
      data: inquiry,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 7. Update Status (Requires lostReason if lost) ────────────────────────────
exports.updateInquiryStatus = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { status, lostReason, assignedTo } = req.body;

    const inquiry = await AdmissionInquiry.findOne({ _id: req.params.id, schoolId });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    if (status === "lost" && (!lostReason || lostReason.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "A lost reason is mandatory when marking an inquiry as lost.",
      });
    }

    const oldStatus = inquiry.status;
    inquiry.status = status;
    if (lostReason) inquiry.lostReason = lostReason.trim();
    if (assignedTo) inquiry.assignedTo = assignedTo;

    // Log status change as a follow-up record
    inquiry.followUps.push({
      date: new Date(),
      mode: "call",
      notes: `Status changed from ${oldStatus.toUpperCase()} to ${status.toUpperCase()}${
        lostReason ? `. Reason: ${lostReason}` : ""
      }`,
      by: req.user._id,
    });

    await inquiry.save();

    await auditLog(req, {
      action: "UPDATE",
      module: "ADMISSIONS",
      details: {
        inquiryId: inquiry._id,
        oldStatus,
        newStatus: status,
        lostReason,
      },
    });

    return res.json({
      success: true,
      message: `Inquiry status changed to ${status}.`,
      data: inquiry,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 8. Convert Inquiry to Student ────────────────────────────────────────────
exports.convertInquiry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const inquiry = await AdmissionInquiry.findOne({ _id: req.params.id, schoolId });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found." });
    }

    // Split name into first and last
    const nameParts = (inquiry.childName || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const prefilledPayload = {
      inquiryId: inquiry._id,
      firstName,
      lastName,
      dob: inquiry.dob,
      parentName: inquiry.parentName,
      phone: inquiry.phone,
      email: inquiry.email,
      applyingForClass: inquiry.applyingForClass,
      gender: "other",
    };

    // If an existing student ID is passed to link
    const { studentId } = req.body;
    if (studentId) {
      const student = await Student.findOne({ _id: studentId, schoolId });
      if (!student) {
        return res.status(404).json({ success: false, message: "Specified student not found." });
      }

      inquiry.convertedStudentId = student._id;
      inquiry.status = "admitted";
      inquiry.followUps.push({
        date: new Date(),
        mode: "call",
        notes: `Converted to registered student: ${student.firstName} ${student.lastName} (Adm No: ${student.admissionNumber})`,
        by: req.user._id,
      });
      await inquiry.save();

      return res.json({
        success: true,
        message: "Inquiry successfully converted and linked to student record.",
        data: { inquiry, student },
      });
    }

    return res.json({
      success: true,
      message: "Prefilled student admission payload ready.",
      data: { prefilledPayload, inquiry },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── 9. Funnel Analytics Aggregation ──────────────────────────────────────────
exports.getInquiryFunnel = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { from, to } = req.query;

    const match = { schoolId };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const STAGES = [
      "new",
      "contacted",
      "visit_scheduled",
      "visited",
      "application_submitted",
      "documents_pending",
      "admitted",
      "rejected",
      "lost",
    ];

    // Counts per stage
    const stageCountsAgg = await AdmissionInquiry.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stageMap = {};
    STAGES.forEach((s) => (stageMap[s] = 0));
    stageCountsAgg.forEach((item) => {
      stageMap[item._id] = item.count;
    });

    const totalInquiries = Object.values(stageMap).reduce((a, b) => a + b, 0);

    // Stage-to-stage sequential funnel conversion %
    const linearStages = [
      { key: "new", label: "New Inquiry" },
      { key: "contacted", label: "Contacted" },
      { key: "visit_scheduled", label: "Visit Scheduled" },
      { key: "visited", label: "Campus Visited" },
      { key: "application_submitted", label: "Application Submitted" },
      { key: "admitted", label: "Admitted" },
    ];

    let cumulativePool = totalInquiries;
    const funnelSteps = linearStages.map((st, index) => {
      const count = stageMap[st.key] || 0;
      const pctOfTotal = totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0;
      return {
        stage: st.key,
        label: st.label,
        count,
        percentOfTotal: pctOfTotal,
      };
    });

    // Average days to convert (for admitted students)
    const admittedItems = await AdmissionInquiry.find({
      ...match,
      status: "admitted",
    })
      .select("createdAt updatedAt")
      .lean();

    let avgDaysToConvert = 0;
    if (admittedItems.length > 0) {
      const totalDays = admittedItems.reduce((acc, item) => {
        const diff = (new Date(item.updatedAt) - new Date(item.createdAt)) / (1000 * 60 * 60 * 24);
        return acc + Math.max(0, diff);
      }, 0);
      avgDaysToConvert = Math.round((totalDays / admittedItems.length) * 10) / 10;
    }

    // Source-wise conversion
    const sourceAgg = await AdmissionInquiry.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$source",
          total: { $sum: 1 },
          admitted: {
            $sum: { $cond: [{ $eq: ["$status", "admitted"] }, 1, 0] },
          },
        },
      },
    ]);

    const sourceStats = sourceAgg.map((s) => ({
      source: s._id || "other",
      total: s.total,
      admitted: s.admitted,
      conversionPercent: s.total > 0 ? Math.round((s.admitted / s.total) * 100) : 0,
    }));

    // Monthly trend (past 6 months)
    const monthlyAgg = await AdmissionInquiry.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          inquiries: { $sum: 1 },
          admitted: {
            $sum: { $cond: [{ $eq: ["$status", "admitted"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyTrend = monthlyAgg.map((m) => {
      const monthDate = new Date(m._id.year, m._id.month - 1, 1);
      return {
        month: monthDate.toLocaleString("default", { month: "short", year: "2-digit" }),
        inquiries: m.inquiries,
        admitted: m.admitted,
      };
    });

    // Seats left per class (capacity minus active students)
    const classes = await ClassSection.find({ schoolId }).sort({ className: 1, section: 1 }).lean();
    const seatsPerClass = await Promise.all(
      classes.map(async (cls) => {
        const activeCount = await Student.countDocuments({
          schoolId,
          classId: cls._id,
          status: "active",
        });
        const capacity = cls.capacity || 40; // Default capacity 40 if not specified
        const seatsLeft = Math.max(0, capacity - activeCount);
        const fillPercent = capacity > 0 ? Math.round((activeCount / capacity) * 100) : 0;
        return {
          classId: cls._id,
          name: `${cls.className}-${cls.section}`,
          className: cls.className,
          section: cls.section,
          capacity,
          enrolled: activeCount,
          seatsLeft,
          fillPercent,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        totalInquiries,
        stageCounts: stageMap,
        funnelSteps,
        avgDaysToConvert,
        overallConversionRate:
          totalInquiries > 0 ? Math.round(((stageMap.admitted || 0) / totalInquiries) * 100) : 0,
        sourceStats,
        monthlyTrend,
        seatsPerClass,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
