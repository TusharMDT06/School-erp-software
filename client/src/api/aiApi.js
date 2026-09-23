import axiosInstance from "./axiosInstance";

/**
 * Send a chat message to the AI assistant.
 * @param {string} message
 */
export const sendChatMessage = (message) =>
  axiosInstance.post("/ai/chat", { message });

/**
 * Get conversation history for the current user.
 */
export const getChatHistory = () => axiosInstance.get("/ai/chat/history");

/**
 * Clear conversation history for the current user.
 */
export const clearChatHistory = () => axiosInstance.delete("/ai/chat");
