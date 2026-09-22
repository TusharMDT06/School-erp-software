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
  .post(authorizeRoles("admin", "superadmin"), createTeacher)
  .get(authorizeRoles("admin", "superadmin", "teacher"), listTeachers);

router
  .route("/:id")
  .get(authorizeRoles("admin", "superadmin", "teacher"), getTeacher)
  .put(authorizeRoles("admin", "superadmin"), updateTeacher)
  .delete(authorizeRoles("admin", "superadmin"), deleteTeacher);

module.exports = router;
