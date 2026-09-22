const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
} = require("../controllers/school.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeRoles("admin", "superadmin"), listSchools);
router.get("/:id", authorizeRoles("admin", "superadmin"), getSchool);
router.post("/", authorizeRoles("superadmin"), createSchool);
router.put("/:id", authorizeRoles("superadmin", "admin"), updateSchool);
router.delete("/:id", authorizeRoles("superadmin"), deleteSchool);

module.exports = router;
