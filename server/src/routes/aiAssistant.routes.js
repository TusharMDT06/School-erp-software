const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { chat, clearChat, getHistory } = require("../controllers/aiAssistant.controller");

// All AI routes require authentication and permitted role
const allowedRoles = authorizeRoles(
  "admin",
  "superadmin",
  "principal",
  "teacher",
  "student",
  "parent",
  "accountant"
);

router.use(authMiddleware);
router.use(allowedRoles);

// POST   /api/ai/chat or /api/ai-chat        → Send a message
router.post("/chat", chat);
router.post("/", chat);

// GET    /api/ai/chat/history or /api/ai-chat/history → Get conversation history
router.get("/chat/history", getHistory);
router.get("/history", getHistory);

// DELETE /api/ai/chat or /api/ai-chat        → Clear conversation
router.delete("/chat", clearChat);
router.delete("/", clearChat);

module.exports = router;
