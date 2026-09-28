const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/cashClosing.controller");

router.use(authMiddleware);

router.get("/preview", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getCashClosingPreview);
router.post("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.closeDay);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getCashClosingHistory);

module.exports = router;
