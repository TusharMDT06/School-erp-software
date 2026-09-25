const { z } = require("zod");
const mongoose = require("mongoose");
const path = require("path");
const User = require("../models/User.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const sendEmail = require("../utils/sendEmail");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const createStudentSchema = z.object({
  // Student admission fields
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  admissionNumber: z.string().min(1, "Admission number is required").trim(),
  dob: z.string().min(1, "Date of birth is required"),
  classId: z.string().min(1, "Class is required"),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  rollNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  guardianEmail: z.string().email().optional().nullable(), // for admission instructions email
  guardianIds: z.array(z.string()).optional(),
  phone: z.string().optional().nullable(),
});

const updateStudentSchema = z.object({
  name: z.string().min(2).trim().optional(),
  phone: z.string().optional().nullable(),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  classId: z.string().optional(),
  rollNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  status: z.enum(["active", "transferred", "alumni"]).optional(),
  guardianIds: z.array(z.string()).optional(),
});

// ── Admission Email Template for Parent ─────────────────────────────────────
const studentAdmissionEmail = ({ studentName, admissionNumber, dobFormatted, signupUrl }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1F4E79, #2563a8); padding: 28px 32px;">
    <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Admission Confirmed 🎓</h2>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">School ERP Admission Portal</p>
  </div>
  <div style="padding: 28px 32px; background: #ffffff;">
    <p style="color: #334155; font-size: 15px;">Dear Parent/Guardian,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      Your child <strong>${studentName}</strong> has been admitted to the school.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 18px 0;">
      <p style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">Account Activation Instructions:</p>
      <p style="margin: 0 0 6px 0; color: #475569; font-size: 14px;">
        Ask them to sign up using:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
        <li>Admission Number: <strong style="font-family: monospace; color: #1F4E79;">${admissionNumber}</strong></li>
        <li>Date of Birth: <strong>${dobFormatted}</strong></li>
      </ul>
    </div>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      Please have your child visit the link below to verify their identity and set up their student account password:
    </p>
    <a href="${signupUrl}"
       style="display: inline-block; padding: 12px 28px; background: #1F4E79; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 10px;">
      Complete Student Signup
    </a>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
      Link: <a href="${signupUrl}" style="color: #1F4E79;">${signupUrl}</a>
    </p>
  </div>
  <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">School ERP — Questions? Contact the school administration.</p>
  </div>
</div>
`;

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/students
//  Admin creates admission record ONLY (User account created later via self-signup)
// ══════════════════════════════════════════════════════════════════════════
const createStudent = async (req, res, next) => {
  try {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const {
      name,
      admissionNumber,
      dob,
      gender,
      classId,
      rollNumber,
      address,
      bloodGroup,
      admissionDate,
      guardianEmail,
      guardianIds,
    } = parsed.data;

    // Pre-flight check for duplicate admission number
    const existingStudent = await Student.findOne({
      admissionNumber: admissionNumber.toUpperCase(),
    });
    if (existingStudent) {
      throw new ApiError(409, "Admission number already exists.");
    }

    // Create Student record directly (isAccountActivated = false, userId = null)
    const student = await Student.create({
      name,
      userId: null,
      isAccountActivated: false,
      admissionNumber: admissionNumber.toUpperCase(),
      dob: new Date(dob),
      gender: gender || null,
      classId,
      rollNumber: rollNumber || null,
      guardianIds: guardianIds || [],
      address: address || null,
      bloodGroup: bloodGroup || null,
      admissionDate: admissionDate ? new Date(admissionDate) : Date.now(),
    });

    // Send admission instructions email to parent (non-blocking)
    const emailTarget = guardianEmail || null;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const signupUrl = `${clientUrl}/student-signup`;

    if (emailTarget) {
      const dobFormatted = new Date(dob).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      sendEmail({
        to: emailTarget,
        subject: `Admission Confirmed — Sign Up Instructions for ${name}`,
        html: studentAdmissionEmail({
          studentName: name,
          admissionNumber: admissionNumber.toUpperCase(),
          dobFormatted,
          signupUrl,
        }),
      }).catch((err) => console.error("Admission email failed (student):", err));
    }

    await student.populate([
      { path: "classId", select: "className section academicYear" },
      { path: "guardianIds", select: "name email phone" },
    ]);

    return res
      .status(201)
      .json(new ApiResponse(201, student, "Student admission record created successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/students
//  Paginated, filterable by classId / status / search
// ══════════════════════════════════════════════════════════════════════════
const listStudents = async (req, res, next) => {
  try {
    const { classId, status, search, page = 1, limit = 15 } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (status) filter.status = status;

    // Teachers can only see students in their assigned classes
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher || !teacher.assignedClasses?.length) {
        return res.status(200).json(
          new ApiResponse(200, { data: [], page: 1, totalPages: 0, totalCount: 0 })
        );
      }
      filter.classId = { $in: teacher.assignedClasses };
    }

    // Students can only view their own student record
    if (req.user.role === "student") {
      filter.userId = new mongoose.Types.ObjectId(req.user.id);
    }

    // Parents can only view their linked children
    if (req.user.role === "parent") {
      filter.guardianIds = new mongoose.Types.ObjectId(req.user.id);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let students, total;

    if (search) {
      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            ...filter,
            ...(filter.classId && typeof filter.classId === "string"
              ? { classId: new mongoose.Types.ObjectId(filter.classId) }
              : {}),
            $or: [
              { name: { $regex: search, $options: "i" } },
              { "userInfo.name": { $regex: search, $options: "i" } },
              { admissionNumber: { $regex: search, $options: "i" } },
            ],
          },
        },
      ];

      const countResult = await Student.aggregate([...pipeline, { $count: "total" }]);
      total = countResult[0]?.total || 0;

      students = await Student.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            name: 1,
            admissionNumber: 1,
            dob: 1,
            gender: 1,
            classId: 1,
            rollNumber: 1,
            status: 1,
            bloodGroup: 1,
            admissionDate: 1,
            isAccountActivated: 1,
            userId: {
              $cond: {
                if: "$userInfo._id",
                then: {
                  _id: "$userInfo._id",
                  name: "$userInfo.name",
                  email: "$userInfo.email",
                  phone: "$userInfo.phone",
                },
                else: null,
              },
            },
          },
        },
      ]);
    } else {
      total = await Student.countDocuments(filter);
      students = await Student.find(filter)
        .populate("userId", "name email phone isActive")
        .populate("classId", "className section academicYear")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          data: students,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total,
        },
        "Students fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/students/:id
// ══════════════════════════════════════════════════════════════════════════
const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("userId", "name email phone profileImage isActive")
      .populate("classId", "className section academicYear schoolId")
      .populate("guardianIds", "name email phone");

    if (!student) throw new ApiError(404, "Student not found.");

    if (req.user.role === "student" && student.userId?._id?.toString() !== req.user.id) {
      throw new ApiError(403, "You are only allowed to view your own student record.");
    }
    if (req.user.role === "parent") {
      const isChild = student.guardianIds?.some((g) => (g._id || g).toString() === req.user.id);
      if (!isChild) {
        throw new ApiError(403, "You are only allowed to view your own children.");
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, student, "Student fetched successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PUT /api/students/:id
// ══════════════════════════════════════════════════════════════════════════
const updateStudent = async (req, res, next) => {
  try {
    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const student = await Student.findById(req.params.id);
    if (!student) throw new ApiError(404, "Student not found.");

    const { name, phone, dob, gender, classId, rollNumber, address, bloodGroup, status, guardianIds } =
      parsed.data;

    // Update linked User if user account exists
    if (student.userId && (name || phone !== undefined)) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (phone !== undefined) userUpdates.phone = phone;
      await User.findByIdAndUpdate(student.userId, userUpdates, { runValidators: true });
    }

    // Update Student
    const studentUpdates = {};
    if (name) studentUpdates.name = name;
    if (dob) studentUpdates.dob = new Date(dob);
    if (gender !== undefined) studentUpdates.gender = gender;
    if (classId) studentUpdates.classId = classId;
    if (rollNumber !== undefined) studentUpdates.rollNumber = rollNumber;
    if (address !== undefined) studentUpdates.address = address;
    if (bloodGroup !== undefined) studentUpdates.bloodGroup = bloodGroup;
    if (status) studentUpdates.status = status;
    if (guardianIds) studentUpdates.guardianIds = guardianIds;

    const updated = await Student.findByIdAndUpdate(req.params.id, studentUpdates, {
      new: true,
      runValidators: true,
    })
      .populate("userId", "name email phone")
      .populate("classId", "className section academicYear");

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Student updated successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  DELETE /api/students/:id  (permanently delete student & linked user)
// ══════════════════════════════════════════════════════════════════════════
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) throw new ApiError(404, "Student not found.");

    // 1. Delete linked user account so their login is removed
    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    // 2. Delete the student document
    await Student.findByIdAndDelete(req.params.id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Student deleted successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/students/:id/documents  (multer processes file before this)
// ══════════════════════════════════════════════════════════════════════════
const uploadDocuments = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) throw new ApiError(404, "Student not found.");

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, "No files uploaded.");
    }

    const newDocs = req.files.map((file) => ({
      name: file.originalname,
      url: file.cloudinaryUrl || `/uploads/${file.filename}`,
    }));

    student.documents.push(...newDocs);
    await student.save();

    return res
      .status(200)
      .json(new ApiResponse(200, student.documents, "Documents uploaded successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/students/me
//  Returns the Student profile for the currently logged-in student user.
//  Accessible by: student role only (uses req.user.id to find their record)
// ══════════════════════════════════════════════════════════════════════════
const getMyStudentProfile = async (req, res, next) => {
  try {
    // Find student whose linked User account is the one making the request
    const student = await Student.findOne({ userId: req.user.id })
      .populate("userId", "name email phone profileImage isActive")
      .populate("classId", "className section academicYear schoolId")
      .populate("guardianIds", "name email phone");

    if (!student) {
      throw new ApiError(404, "No student profile linked to your account.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, student, "Student profile fetched successfully."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStudent,
  listStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  uploadDocuments,
  getMyStudentProfile,
};
