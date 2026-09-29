const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getPrincipalDashboard } = require("../controllers/principal.controller");
const { getMorningBrief, refreshMorningBrief } = require("../controllers/morningBrief.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles("principal", "admin", "superadmin"));

router.get("/dashboard", getPrincipalDashboard);
router.get("/morning-brief", getMorningBrief);
router.post("/morning-brief/refresh", refreshMorningBrief);

module.exports = router;
