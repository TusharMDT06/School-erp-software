const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createCircular,
  getCirculars,
  getCircularById,
  updateCircular,
  publishCircular,
  getMyCirculars,
  markAsRead,
  acknowledgeCircular,
  getCircularStats,
  remindNonResponders,
} = require("../controllers/circular.controller");

const { cacheMiddleware } = require("../middlewares/cache.middleware");

const router = express.Router();

router.use(authMiddleware);

// User-specific circular inbox (must be before /:id)
router.get("/mine", cacheMiddleware({ ttl: 60, prefix: "circulars:mine" }), getMyCirculars);

// Principal & Admin Circular CRUD
router
  .route("/")
  .get(
    authorizeRoles("principal", "admin", "superadmin"),
    cacheMiddleware({ ttl: 60, prefix: "circulars:list" }),
    getCirculars
  )
  .post(authorizeRoles("principal", "admin", "superadmin"), createCircular);

// Publish circular
router.put(
  "/:id/publish",
  authorizeRoles("principal", "admin", "superadmin"),
  publishCircular
);

// Individual read & acknowledge (any role for their own receipt)
router.post("/:id/read", markAsRead);
router.post("/:id/acknowledge", acknowledgeCircular);

// Circular stats & Reminders
router.get(
  "/:id/stats",
  authorizeRoles("principal", "admin", "superadmin"),
  getCircularStats
);
router.post(
  "/:id/remind",
  authorizeRoles("principal", "admin", "superadmin"),
  remindNonResponders
);

// Circular detail & editing
router
  .route("/:id")
  .get(authorizeRoles("principal", "admin", "superadmin"), getCircularById)
  .put(authorizeRoles("principal", "admin", "superadmin"), updateCircular);

module.exports = router;
