const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createTeacher,
  listTeachers,
  getTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacher.controller");

const router = express.Router();

router.use(authMiddleware);

router
  .route("/")
  .post(authorizeRoles("admin", "superadmin", "principal"), createTeacher)
  .get(authorizeRoles("admin", "superadmin", "teacher", "principal"), listTeachers);

router
  .route("/:id")
  .get(authorizeRoles("admin", "superadmin", "teacher", "principal"), getTeacher)
  .put(authorizeRoles("admin", "superadmin", "principal"), updateTeacher)
  .delete(authorizeRoles("admin", "superadmin"), deleteTeacher);

module.exports = router;
