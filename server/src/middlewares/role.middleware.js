const { ApiError } = require("../utils/apiResponse");

/**
 * Role-Based Access Control Middleware Factory
 * ─────────────────────────────────────────────
 * Returns an Express middleware that restricts access to users
 * whose role is included in the provided `allowedRoles` list.
 *
 * Must be used AFTER authMiddleware (which populates req.user).
 *
 * Usage:
 *   router.post('/register',
 *     authMiddleware,
 *     authorizeRoles('admin', 'superadmin'),
 *     registerController
 *   );
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role(s): [${allowedRoles.join(", ")}]. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

module.exports = { authorizeRoles };
