const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/roleGuard.middleware");
const { getStaffOverview } = require("../controllers/staff.controller");

router.use(authMiddleware);
router.use(roleGuard(["principal", "admin", "superadmin"]));

router.get("/overview", getStaffOverview);

module.exports = router;
