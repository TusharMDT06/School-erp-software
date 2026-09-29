const express = require("express");
const router = express.Router();
const monthlyReportController = require("../controllers/monthlyReport.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.use(
  authMiddleware,
  authorizeRoles("principal", "admin", "superadmin")
);

router.get("/monthly", monthlyReportController.getMonthlySnapshot);
router.post("/monthly/generate", monthlyReportController.generateMonthlyReport);
router.get("/:id/download", monthlyReportController.downloadReport);
router.get("/", monthlyReportController.listReports);

module.exports = router;
