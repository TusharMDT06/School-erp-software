const jwt = require("jsonwebtoken");
const { z } = require("zod");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const ClassSection = require("../models/ClassSection.model");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const SIGNUP_TOKEN_SECRET =
  process.env.SIGNUP_TOKEN_SECRET || "fallback_student_signup_token_secret_2026_xyz";

const isHttpsOrProd =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.CLIENT_URL && process.env.CLIENT_URL.startsWith("https"));

const refreshCookieOptions = {
  httpOnly: true,
  secure: isHttpsOrProd,
  sameSite: isHttpsOrProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Validation Schemas ──────────────────────────────────────────────────────

const verifySchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required").trim(),
  dob: z.string().min(1, "Date of birth is required"),
});

const completeSchema = z.object({
  signupToken: z.string().min(1, "Signup token is required"),
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one number"),
});

// ── Email Templates ─────────────────────────────────────────────────────────

const studentWelcomeEmail = ({ studentName, email, admissionNumber, dashboardUrl }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #1F4E79, #2563a8); padding: 28px 32px;">
    <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Welcome to School ERP! 🎓</h2>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Your student account is now active</p>
  </div>
  <div style="padding: 28px 32px; background: #ffffff;">
    <p style="color: #334155; font-size: 15px;">Hello <strong>${studentName}</strong>,</p>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      Your student portal account has been successfully set up and activated.
    </p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
      <p style="margin: 0 0 6px 0; color: #475569; font-size: 13px;">Registered Email: <strong style="color: #1e293b;">${email}</strong></p>
      <p style="margin: 0; color: #475569; font-size: 13px;">Admission No: <strong style="color: #1F4E79; font-family: monospace;">${admissionNumber}</strong></p>
    </div>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      You can now log in anytime to access your class attendance, fee statements, exam timetables, and report cards.
    </p>
    <a href="${dashboardUrl}"
       style="display: inline-block; padding: 12px 28px; background: #1F4E79; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 10px;">
      Go to Student Dashboard
    </a>
  </div>
  <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0; color: #94a3b8; font-size: 12px;">If you did not create this account, please contact the school administration immediately.</p>
  </div>
</div>
`;

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/student-signup/verify
//  Public pre-auth endpoint (rate-limited)
// ══════════════════════════════════════════════════════════════════════════
const verifyStudentSignup = async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid admission number or date of birth.");
    }

    const { admissionNumber, dob } = parsed.data;

    // Find student by admission number
    const student = await Student.findOne({
      admissionNumber: admissionNumber.trim().toUpperCase(),
    });

    // Timing-safe & enumeration-safe: don't reveal whether admission number or dob was wrong
    if (!student) {
      throw new ApiError(400, "Invalid admission number or date of birth.");
    }

    // Compare date of birth
    const inputDate = new Date(dob);
    const storedDate = new Date(student.dob);

    if (isNaN(inputDate.getTime()) || isNaN(storedDate.getTime())) {
      throw new ApiError(400, "Invalid admission number or date of birth.");
    }

    const inputIso = inputDate.toISOString().slice(0, 10);
    const storedIso = storedDate.toISOString().slice(0, 10);
    const isDateMatch =
      inputIso === storedIso ||
      (inputDate.getFullYear() === storedDate.getFullYear() &&
        inputDate.getMonth() === storedDate.getMonth() &&
        inputDate.getDate() === storedDate.getDate());

    if (!isDateMatch) {
      throw new ApiError(400, "Invalid admission number or date of birth.");
    }

    // Check if student account is already activated
    if (student.isAccountActivated) {
      throw new ApiError(409, "Account already activated. Please login instead.");
    }

    // Generate short-lived JWT signupToken (15m expiry)
    const signupToken = jwt.sign(
      { studentId: student._id.toString() },
      SIGNUP_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          signupToken,
          studentName: student.name,
        },
        "Verification successful. Please complete your account details."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/student-signup/complete
//  Public pre-auth endpoint — creates User, activates Student, logs in
// ══════════════════════════════════════════════════════════════════════════
const completeStudentSignup = async (req, res, next) => {
  try {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Validation failed";
      throw new ApiError(422, firstError);
    }

    const { signupToken, email, password } = parsed.data;

    // 1. Verify signupToken signature & expiration
    let decoded;
    try {
      decoded = jwt.verify(signupToken, SIGNUP_TOKEN_SECRET);
    } catch (tokenErr) {
      throw new ApiError(400, "Invalid or expired signup token. Please start verification again.");
    }

    const studentId = decoded.studentId;
    if (!studentId) {
      throw new ApiError(400, "Invalid signup token payload.");
    }

    // 2. Fetch Student record
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student record not found.");
    }

    // 3. Re-check isAccountActivated and replay flag (handles race conditions)
    if (student.isAccountActivated || student.signupTokenUsed) {
      throw new ApiError(409, "Account already activated. Please login instead.");
    }

    // 4. Validate email uniqueness in Users collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "An account with this email already exists. Please choose another email.");
    }

    // 5. Look up schoolId from classSection if present
    let schoolId = null;
    if (student.classId) {
      const classSection = await ClassSection.findById(student.classId);
      schoolId = classSection?.schoolId || null;
    }

    // 6. Create User account (pre-save hook hashes password)
    const newUser = await User.create({
      name: student.name,
      email,
      password,
      role: "student",
      schoolId,
      isActive: true,
    });

    // 7. Update Student record
    student.userId = newUser._id;
    student.isAccountActivated = true;
    student.signupTokenUsed = true;
    await student.save();

    // 8. Issue access + refresh tokens (auto-login)
    const tokenPayload = {
      id: newUser._id,
      role: newUser.role,
      schoolId: newUser.schoolId,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    newUser.refreshToken = refreshToken;
    await newUser.save({ validateBeforeSave: false });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    // 9. Send welcome/confirmation email via Resend (non-blocking)
    const dashboardUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/student/dashboard`;
    sendEmail({
      to: email,
      subject: `Welcome to School ERP — Account Activated!`,
      html: studentWelcomeEmail({
        studentName: student.name,
        email,
        admissionNumber: student.admissionNumber,
        dashboardUrl,
      }),
    }).catch((err) => console.error("Signup welcome email failed:", err));

    // 10. Return user and accessToken for immediate client-side login
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            schoolId: newUser.schoolId,
            profileImage: newUser.profileImage,
          },
          accessToken,
          redirectTo: "/student/dashboard",
        },
        "Account created and activated successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyStudentSignup,
  completeStudentSignup,
};
