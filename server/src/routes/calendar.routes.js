const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createEvent,
  getEvents,
  getEventById,
  getAudiencePreview,
  publishEvent,
  updateEvent,
  cancelEvent,
} = require("../controllers/calendar.controller");

const { cacheMiddleware } = require("../middlewares/cache.middleware");

const router = express.Router();

router.use(authMiddleware);

// Event read (all authenticated roles) & creation (principal, admin, superadmin)
router
  .route("/events")
  .get(cacheMiddleware({ ttl: 120, prefix: "calendar:events" }), getEvents)
  .post(authorizeRoles("principal", "admin", "superadmin"), createEvent);

// Audience Preview before publish
router.get(
  "/events/:id/audience-preview",
  authorizeRoles("principal", "admin", "superadmin"),
  getAudiencePreview
);

// Publish event & dispatch notifications
router.put(
  "/events/:id/publish",
  authorizeRoles("principal", "admin", "superadmin"),
  publishEvent
);

// Cancel event (soft delete)
router.put(
  "/events/:id/cancel",
  authorizeRoles("principal", "admin", "superadmin"),
  cancelEvent
);

// Event details & editing
router
  .route("/events/:id")
  .get(getEventById)
  .put(authorizeRoles("principal", "admin", "superadmin"), updateEvent);

module.exports = router;
