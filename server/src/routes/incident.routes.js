const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/roleGuard.middleware");
const {
  createIncident,
  getIncidents,
  updateIncident,
  notifyIncidentParent,
} = require("../controllers/incident.controller");

router.use(authMiddleware);

// Students and parents are blocked from this module
router.post(
  "/",
  roleGuard(["principal", "admin", "superadmin", "teacher"]),
  createIncident
);
router.get(
  "/",
  roleGuard(["principal", "admin", "superadmin", "teacher"]),
  getIncidents
);
router.put(
  "/:id",
  roleGuard(["principal", "admin", "superadmin"]),
  updateIncident
);
router.post(
  "/:id/notify-parent",
  roleGuard(["principal", "admin", "superadmin"]),
  notifyIncidentParent
);

module.exports = router;
