const { ApiError } = require("../utils/apiResponse");

/**
 * roleGuard middleware factory
 * Accepts an array of allowed roles or rest arguments
 * e.g. roleGuard(["principal", "admin"]) or roleGuard("principal", "admin")
 */
const roleGuard = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated."));
    }

    if (!allowed.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role(s): [${allowed.join(", ")}]. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

module.exports = roleGuard;
