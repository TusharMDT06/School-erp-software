const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    // Gemini uses "parts" — we store the text content only
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "teacher", "student", "parent", "accountant"],
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
    // Rolling window — keep only last 20 messages (10 exchanges)
    messages: {
      type: [messageSchema],
      default: [],
    },
    // Title derived from first user message (truncated to 60 chars)
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-trim conversation to last 20 messages before saving
chatConversationSchema.pre("save", function (next) {
  if (this.messages.length > 20) {
    this.messages = this.messages.slice(-20);
  }
  next();
});

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
