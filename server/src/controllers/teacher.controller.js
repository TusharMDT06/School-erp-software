const { z } = require("zod");
const mongoose = require("mongoose");
const User = require("../models/User.model");
const Teacher = require("../models/Teacher.model");
const sendEmail = require("../utils/sendEmail");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createTeacherSchema = z.object({
  // User fields
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  // Teacher-specific fields
  employeeId: z.string().min(1, "Employee ID is required").trim(),
  subjects: z.array(z.string()).optional().default([]),
  qualifications: z.array(z.string()).optional().default([]),
  joiningDate: z.string().optional().nullable(),
  salary: z.number().nonnegative().optional().nullable(),
});

const updateTeacherSchema = z.object({
  // User fields (optional on update)
  name: z.string().min(2).trim().optional(),
  phone: z.string().optional().nullable(),
  // Teacher-specific fields
  employeeId: z.string().min(1).trim().optional(),
  subjects: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  joiningDate: z.string().optional().nullable(),
  salary: z.number().nonnegative().optional().nullable(),
  assignedClasses: z.array(z.string()).optional(),
});

// ── Welcome email template ──────────────────────────────────────────────────
const teacherWelcomeEmail = ({ name, email, password, loginUrl }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1F4E79, #2563a8); padding: 28px 32px;">
    <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Welcome to School ERP 🎓</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">Your teacher account is ready</p>
  </div>
  <div style="padding: 28px 32px; background: #ffffff;">
    <p style="color: #334155; font-size: 15px;">Hi <strong>${name}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      Your teacher account has been created. Use the credentials below to log in:
    </p>
    <div style="background: #f1f5f9; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; color: #64748b; font-size: 13px;"><strong>Temporary Password:</strong> ${password}</p>
    </div>
    <p style="color: #ef4444; font-size: 13px;">⚠️ Please change your password immediately after first login.</p>
    <a href="${loginUrl}"
       style="display: inline-block; padding: 12px 28px; background: #1F4E79; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 8px;">
      Log In Now
    </a>
  </div>
  <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">School ERP — Do not share your credentials with anyone.</p>
  </div>
</div>
`;

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/teachers
// ══════════════════════════════════════════════════════════════════════════
const createTeacher = async (req, res, next) => {
  try {
    const parsed = createTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const {
      name, email, password, phone, schoolId,
      employeeId, subjects, qualifications, joiningDate, salary,
    } = parsed.data;

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "A user with this email already exists.");
    }

    // Check for duplicate employeeId
    const existingTeacher = await Teacher.findOne({ employeeId: employeeId.toUpperCase() });
    if (existingTeacher) {
      throw new ApiError(409, "A teacher with this Employee ID already exists.");
    }

    // Create User record
    const user = await User.create({
      name,
      email,
      password,
      role: "teacher",
      phone: phone || null,
      schoolId: schoolId || req.user?.schoolId || null,
    });

    // Create Teacher profile
    const teacher = await Teacher.create({
      userId: user._id,
      employeeId: employeeId.toUpperCase(),
      subjects: subjects || [],
      qualifications: qualifications || [],
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      salary: salary ?? null,
    });

    // Send welcome email (non-blocking — don't fail creation if email fails)
    const loginUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/login`;
    sendEmail({
      to: email,
      subject: "Welcome to School ERP — Your Teacher Account",
      html: teacherWelcomeEmail({ name, email, password, loginUrl }),
    }).catch((err) => console.error("Welcome email failed (teacher):", err));

    // Populate user info for response
    await teacher.populate("userId", "name email phone role");

    return res
      .status(201)
      .json(new ApiResponse(201, teacher, "Teacher created successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/teachers
// ══════════════════════════════════════════════════════════════════════════
const listTeachers = async (req, res, next) => {
  try {
    const { subject, search, page = 1, limit = 15 } = req.query;

    const filter = {};
    if (subject) filter.subjects = { $in: [subject] };

    // If the requesting user is a teacher, they can only see themselves
    if (req.user.role === "teacher") {
      const self = await Teacher.findOne({ userId: req.user.id });
      if (!self) return res.status(200).json(new ApiResponse(200, { data: [], page: 1, totalPages: 0, totalCount: 0 }));
      filter._id = self._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build aggregation to filter by user name/email (search)
    let teachers;
    let total;

    if (search) {
      // We need to join with User to search by name/email
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $match: {
            ...filter,
            $or: [
              { "userInfo.name": { $regex: search, $options: "i" } },
              { "userInfo.email": { $regex: search, $options: "i" } },
              { employeeId: { $regex: search, $options: "i" } },
            ],
          },
        },
      ];

      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Teacher.aggregate(countPipeline);
      total = countResult[0]?.total || 0;

      const dataPipeline = [
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            employeeId: 1, subjects: 1, qualifications: 1,
            joiningDate: 1, salary: 1, assignedClasses: 1,
            createdAt: 1, updatedAt: 1,
            userId: {
              _id: "$userInfo._id",
              name: "$userInfo.name",
              email: "$userInfo.email",
              phone: "$userInfo.phone",
              isActive: "$userInfo.isActive",
              profileImage: "$userInfo.profileImage",
            },
          },
        },
      ];
      teachers = await Teacher.aggregate(dataPipeline);
    } else {
      total = await Teacher.countDocuments(filter);
      teachers = await Teacher.find(filter)
        .populate("userId", "name email phone isActive profileImage")
        .populate("assignedClasses", "className section academicYear")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          data: teachers,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total,
        },
        "Teachers fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/teachers/:id
// ══════════════════════════════════════════════════════════════════════════
const getTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate("userId", "name email phone isActive profileImage schoolId")
      .populate("assignedClasses", "className section academicYear");

    if (!teacher) {
      throw new ApiError(404, "Teacher not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, teacher, "Teacher fetched successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PUT /api/teachers/:id
// ══════════════════════════════════════════════════════════════════════════
const updateTeacher = async (req, res, next) => {
  try {
    const parsed = updateTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) throw new ApiError(404, "Teacher not found.");

    const { name, phone, employeeId, subjects, qualifications, joiningDate, salary, assignedClasses } =
      parsed.data;

    // Update linked User fields if provided
    if (name || phone !== undefined) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (phone !== undefined) userUpdates.phone = phone;
      await User.findByIdAndUpdate(teacher.userId, userUpdates, { runValidators: true });
    }

    // Update Teacher fields
    const teacherUpdates = {};
    if (employeeId) teacherUpdates.employeeId = employeeId.toUpperCase();
    if (subjects) teacherUpdates.subjects = subjects;
    if (qualifications) teacherUpdates.qualifications = qualifications;
    if (joiningDate !== undefined) teacherUpdates.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (salary !== undefined) teacherUpdates.salary = salary;
    if (assignedClasses) teacherUpdates.assignedClasses = assignedClasses;

    const updated = await Teacher.findByIdAndUpdate(req.params.id, teacherUpdates, {
      new: true,
      runValidators: true,
    }).populate("userId", "name email phone isActive");

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Teacher updated successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE /api/teachers/:id  (soft delete — deactivates linked User)
// ══════════════════════════════════════════════════════════════════════════
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) throw new ApiError(404, "Teacher not found.");

    // Soft delete: deactivate the user account
    await User.findByIdAndUpdate(teacher.userId, { isActive: false });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Teacher deactivated successfully."));
  } catch (err) {
    next(err);
  }
};

module.exports = { createTeacher, listTeachers, getTeacher, updateTeacher, deleteTeacher };
