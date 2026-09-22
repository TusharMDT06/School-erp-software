const { ApiError } = require("../utils/apiResponse");

/**
 * Centralized Error Handling Middleware
 * ──────────────────────────────────────
 * Must be registered LAST in the Express middleware chain.
 * Catches all errors passed via next(error) and returns a
 * consistent JSON shape: { success, message, errors? }
 *
 * Handles:
 *   - ApiError (custom app errors)
 *   - Mongoose ValidationError
 *   - Mongoose CastError (invalid ObjectId)
 *   - Mongoose duplicate key error (code 11000)
 *   - JWT errors (caught here if not handled in authMiddleware)
 *   - Generic unhandled errors (500)
 */
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // ── Mongoose Validation Error ──────────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── Mongoose CastError (e.g., invalid ObjectId) ───────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // ── MongoDB Duplicate Key Error ────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists.`;
  }

  // ── JWT Errors (fallback if not caught in middleware) ─────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired.";
  }

  // ── Log in development ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${statusCode} — ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
};

module.exports = errorMiddleware;
