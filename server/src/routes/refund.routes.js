const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/refund.controller");

router.use(authMiddleware);

router.post("/", authorizeRoles("accountant", "admin", "superadmin"), ctrl.createRefund);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getRefunds);
router.put("/:id/decide", authorizeRoles("admin", "superadmin", "principal"), ctrl.decideRefund);
router.put("/:id/pay", authorizeRoles("accountant", "admin", "superadmin"), ctrl.payRefund);

module.exports = router;
