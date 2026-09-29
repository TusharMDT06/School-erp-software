const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/roleGuard.middleware");
const {
  getAtRiskStudents,
  getStudentWelfareDetail,
  createIntervention,
  updateIntervention,
  generateParentTalkingPoints,
} = require("../controllers/welfare.controller");

router.use(authMiddleware);
router.use(roleGuard(["principal", "admin", "superadmin", "teacher"]));

// Welfare routes
router.get("/at-risk", getAtRiskStudents);
router.get("/students/:id", getStudentWelfareDetail);
router.post("/interventions", createIntervention);
router.put("/interventions/:id", updateIntervention);
router.post("/students/:id/talking-points", generateParentTalkingPoints);

module.exports = router;
