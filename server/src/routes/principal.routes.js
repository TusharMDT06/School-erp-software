const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getPrincipalDashboard } = require("../controllers/principal.controller");
const { getMorningBrief, refreshMorningBrief } = require("../controllers/morningBrief.controller");

const router = express.Router();

router.use(authMiddleware);

const canAccess = authorizeRoles("principal", "admin", "superadmin");

router.get("/dashboard", canAccess, getPrincipalDashboard);
router.get("/morning-brief", canAccess, getMorningBrief);
router.post("/morning-brief/refresh", canAccess, refreshMorningBrief);

module.exports = router;
