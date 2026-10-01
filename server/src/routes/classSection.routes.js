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

const { cacheMiddleware } = require("../middlewares/cache.middleware");

const router = express.Router();

// All class routes require authentication
router.use(authMiddleware);

router
  .route("/")
  .post(authorizeRoles("admin", "superadmin"), createClass)
  .get(
    authorizeRoles("admin", "superadmin", "teacher", "accountant", "principal"),
    cacheMiddleware({ ttl: 180, prefix: "classes:list" }),
    listClasses
  );

router
  .route("/:id")
  .get(
    authorizeRoles("admin", "superadmin", "teacher", "accountant", "principal"),
    cacheMiddleware({ ttl: 180, prefix: "classes:detail" }),
    getClass
  )
  .put(authorizeRoles("admin", "superadmin"), updateClass)
  .delete(authorizeRoles("admin", "superadmin"), deleteClass);

module.exports = router;
