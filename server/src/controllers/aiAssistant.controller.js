const { processChat, clearConversation, getConversationHistory } = require("../services/aiAssistant.service");
const { ApiError, ApiResponse } = require("../utils/apiResponse");

/**
 * POST /api/ai/chat
 * Body: { message: string }
 */
const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new ApiError(400, "Message is required.");
    }

    // Check API key is configured before hitting Gemini
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json(
        new ApiResponse(200, {
          reply: "⚙️ AI assistant needs setup: Please add a valid **GEMINI_API_KEY** to your server `.env` file.\n\nGet a free key at: https://aistudio.google.com/app/apikey",
        }, "AI not configured.")
      );
    }

    const { id: userId, role, schoolId } = req.user;
    const result = await processChat(userId, role, schoolId, message.trim());

    return res.status(200).json(
      new ApiResponse(200, result, "AI response generated.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/ai/chat
 * Clears the conversation history for this user+role.
 */
const clearChat = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    await clearConversation(userId, role);
    return res.status(200).json(
      new ApiResponse(200, null, "Conversation cleared.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai/chat/history
 * Returns the conversation history (messages array).
 */
const getHistory = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;
    const messages = await getConversationHistory(userId, role);
    return res.status(200).json(
      new ApiResponse(200, { messages }, "History fetched.")
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { chat, clearChat, getHistory };
