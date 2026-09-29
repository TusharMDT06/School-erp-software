const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/roleGuard.middleware");
const {
  getSubstitutionSuggestions,
  getPeriodsNeedingCover,
  createSubstitution,
  getSubstitutionsByDate,
  cancelSubstitution,
} = require("../controllers/substitution.controller");

router.use(authMiddleware);

// Viewing substitutions is allowed for principal, admin, teacher
router.get(
  "/",
  roleGuard(["principal", "admin", "superadmin", "teacher"]),
  getSubstitutionsByDate
);
router.get(
  "/suggestions",
  roleGuard(["principal", "admin", "superadmin"]),
  getSubstitutionSuggestions
);
router.get(
  "/periods-needing-cover",
  roleGuard(["principal", "admin", "superadmin"]),
  getPeriodsNeedingCover
);
router.post(
  "/",
  roleGuard(["principal", "admin", "superadmin"]),
  createSubstitution
);
router.put(
  "/:id/cancel",
  roleGuard(["principal", "admin", "superadmin"]),
  cancelSubstitution
);

module.exports = router;
