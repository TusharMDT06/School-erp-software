const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/apiResponse");

/**
 * Authentication Middleware
 * ─────────────────────────
 * Extracts the Bearer token from the Authorization header,
 * verifies it using JWT_SECRET, and attaches the decoded
 * payload to req.user for downstream use.
 *
 * Returns 401 if:
 *   - No Authorization header / token missing
 *   - Token is expired
 *   - Token signature is invalid
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token missing. Please log in.");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach only what downstream middleware/controllers need
    req.user = {
      id: decoded.id,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Access token expired. Please refresh."));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid access token."));
    }
    next(error);
  }
};

module.exports = authMiddleware;
