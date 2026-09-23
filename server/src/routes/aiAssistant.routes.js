const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { chat, clearChat, getHistory } = require("../controllers/aiAssistant.controller");

// All AI routes require authentication
router.use(authMiddleware);

// POST   /api/ai/chat         → Send a message
router.post("/chat", chat);

// GET    /api/ai/chat/history → Get conversation history
router.get("/chat/history", getHistory);

// DELETE /api/ai/chat         → Clear conversation
router.delete("/chat", clearChat);

module.exports = router;
