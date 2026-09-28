const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/ledger.controller");

router.use(authMiddleware);

router.get("/daybook", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getDaybook);
router.get("/cashbook", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getCashbook);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getLedgerEntries);

module.exports = router;
