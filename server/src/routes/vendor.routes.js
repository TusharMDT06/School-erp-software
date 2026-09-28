const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/vendor.controller");

router.use(authMiddleware);

router.post("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.createVendor);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getVendors);
router.get("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getVendorById);
router.put("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.updateVendor);
router.delete("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.deleteVendor);

module.exports = router;
