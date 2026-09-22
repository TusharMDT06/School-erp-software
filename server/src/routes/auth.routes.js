const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/auth.controller");
const studentSignupRoutes = require("./studentSignup.routes");

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────────

/** Strict limiter for login: max 10 attempts per 15 minutes */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Moderate limiter for forgot-password: max 5 requests per hour */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again after 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ────────────────────────────────────────────────────────────────

// Public routes
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Student self-signup pre-auth endpoints:
// POST /api/auth/student-signup/verify
// POST /api/auth/student-signup/complete
router.use("/student-signup", studentSignupRoutes);

// Protected routes
router.post(
  "/register",
  authMiddleware,
  authorizeRoles("admin", "superadmin"),
  register
);

router.get("/me", authMiddleware, getMe);

module.exports = router;
