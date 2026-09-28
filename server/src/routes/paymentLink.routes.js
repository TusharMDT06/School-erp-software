const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/paymentLink.controller");

router.use(authMiddleware);

const canManage = authorizeRoles("accountant", "admin", "superadmin", "principal");

router.post("/payment-link", canManage, ctrl.createPaymentLink);
router.get("/payment-links", canManage, ctrl.getPaymentLinks);

module.exports = router;
