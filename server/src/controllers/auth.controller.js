const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User.model");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

// ─── Zod Validation Schemas ────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["superadmin", "admin", "teacher", "student", "parent", "accountant"]),
  phone: z.string().optional(),
  schoolId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// ─── Helper: Cookie Options ────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
  httpOnly: true,         // Not accessible via JavaScript
  secure: isProduction,   // HTTPS only in prod (required for sameSite: "none")
  sameSite: isProduction ? "none" : "lax", // "none" allows cross-domain cookies between Render frontend & backend
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── Helper: Role-to-Dashboard Map (used in error hints) ──────────────────

const roleDashboard = {
  superadmin: "/admin/dashboard",
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
  accountant: "/accountant/dashboard",
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/register
//  Protected: admin / superadmin only
// ══════════════════════════════════════════════════════════════════════════
const register = async (req, res, next) => {
  try {
    // 1. Validate request body with Zod
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const { name, email, password, role, phone, schoolId } = parsed.data;

    // 2. Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, "A user with this email already exists.");
    }

    // 3. Create user — password hashed via pre-save hook
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: phone || null,
      schoolId: schoolId || null,
    });

    // 4. Return created user (toJSON strips password + tokens)
    return res
      .status(201)
      .json(new ApiResponse(201, user, "User registered successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════
const login = async (req, res, next) => {
  try {
    // 1. Validate
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const { email, password } = parsed.data;

    // 2. Find user; select password (hidden by default via `select: false`)
    const user = await User.findOne({ email }).select("+password +refreshToken");
    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // 3. Check account status
    if (!user.isActive) {
      throw new ApiError(403, "Account is deactivated. Contact your administrator.");
    }

    // 4. Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // 5. Generate tokens
    const tokenPayload = { id: user._id, role: user.role, schoolId: user.schoolId };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 6. Persist refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // 7. Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    // 8. Return access token + safe user data
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            schoolId: user.schoolId,
            profileImage: user.profileImage,
          },
          accessToken,
          redirectTo: roleDashboard[user.role] || "/dashboard",
        },
        "Login successful."
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/refresh-token
//  Reads refresh token from httpOnly cookie, issues new access token
// ══════════════════════════════════════════════════════════════════════════
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new ApiError(401, "Refresh token missing. Please log in again.");
    }

    // 1. Verify the refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token. Please log in again.");
    }

    // 2. Find user and validate stored refresh token (single-session check)
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      // Token reuse detected or user not found — clear cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      });
      throw new ApiError(401, "Session invalid. Please log in again.");
    }

    // 3. Issue new access token
    const accessToken = generateAccessToken({
      id: user._id,
      role: user.role,
      schoolId: user.schoolId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { accessToken }, "Access token refreshed."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/logout
// ══════════════════════════════════════════════════════════════════════════
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Clear the refreshToken field in DB for the user who owns this token
      await User.findOneAndUpdate(
        { refreshToken: token },
        { $set: { refreshToken: null } },
        { new: false }
      );
    }

    // Clear cookie regardless
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Logged out successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════
const forgotPassword = async (req, res, next) => {
  try {
    // 1. Validate
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const { email } = parsed.data;

    // 2. Find user (don't reveal if email exists — send generic message)
    const user = await User.findOne({ email });

    if (user) {
      // 3. Generate a cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");

      // 4. Store HASHED token in DB (raw token travels in email only)
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save({ validateBeforeSave: false });

      // 5. Build reset URL and send email
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #1F4E79;">School ERP — Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>You requested to reset your password. Click the button below. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#1F4E79;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0;">
            Reset Password
          </a>
          <p>If you didn't request this, please ignore this email.</p>
          <p style="color:#888;font-size:12px;">Reset link: ${resetUrl}</p>
        </div>
      `;

      try {
        await sendEmail({ to: user.email, subject: "Password Reset Request", html });
      } catch (emailError) {
        // Roll back token if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(500, "Email could not be sent. Please try again.");
      }
    }

    // 6. Always return a generic message (prevent email enumeration)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "If an account with that email exists, a password reset link has been sent."
        )
      );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  POST /api/auth/reset-password/:token
// ══════════════════════════════════════════════════════════════════════════
const resetPassword = async (req, res, next) => {
  try {
    // 1. Validate new password
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ApiError(422, "Validation failed", errors);
    }

    const { newPassword } = parsed.data;
    const { token } = req.params;

    // 2. Hash the raw token from URL to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 3. Find user with valid (non-expired) reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new ApiError(400, "Password reset token is invalid or has expired.");
    }

    // 4. Update password — pre-save hook re-hashes it
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // Invalidate all existing sessions
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password reset successfully. Please log in."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  GET /api/auth/me
//  Protected route — returns current user's profile
// ══════════════════════════════════════════════════════════════════════════
const getMe = async (req, res, next) => {
  try {
    // req.user.id set by authMiddleware
    const user = await User.findById(req.user.id).populate("schoolId", "name logoUrl");

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User profile fetched."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
