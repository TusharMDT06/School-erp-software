const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  verifyStudentSignup,
  completeStudentSignup,
} = require("../controllers/studentSignup.controller");

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────────
// Aggressive rate-limiting for student verification (guessable-credential protection)
// Max 5 attempts per 15 minutes per IP
const studentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: "Too many verification attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Pre-Auth Routes ────────────────────────────────────────────────
// NOTE: These endpoints are intentionally public (pre-auth) and must NOT be
// guarded by authMiddleware. They represent the self-onboarding flow for students.

/**
 * @route   POST /api/auth/student-signup/verify
 * @desc    Verify admission number + date of birth; returns short-lived signupToken
 * @access  Public (Rate-limited: 5 req / 15 min)
 */
router.post("/verify", studentVerifyLimiter, verifyStudentSignup);

/**
 * @route   POST /api/auth/student-signup/complete
 * @desc    Submit email & password with valid signupToken; creates User & auto-logs in
 * @access  Public
 */
router.post("/complete", completeStudentSignup);

module.exports = router;
