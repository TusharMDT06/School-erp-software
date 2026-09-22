const jwt = require("jsonwebtoken");

/**
 * Generate a short-lived JWT access token (15 minutes).
 * Payload: { id, role, schoolId }
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
};

/**
 * Generate a long-lived JWT refresh token (7 days).
 * Stored in DB + sent as httpOnly cookie.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
