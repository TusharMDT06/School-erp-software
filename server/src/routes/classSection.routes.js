const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
} = require("../controllers/classSection.controller");

const router = express.Router();

// All class routes require authentication
router.use(authMiddleware);

router
  .route("/")
  .post(authorizeRoles("admin", "superadmin"), createClass)
  .get(authorizeRoles("admin", "superadmin", "teacher"), listClasses);

router
  .route("/:id")
  .get(authorizeRoles("admin", "superadmin", "teacher"), getClass)
  .put(authorizeRoles("admin", "superadmin"), updateClass)
  .delete(authorizeRoles("admin", "superadmin"), deleteClass);

module.exports = router;
