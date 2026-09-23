const { generateContent, parseResponse } = require("../config/geminiClient");
const ChatConversation = require("../models/ChatConversation.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");

const { adminToolDeclarations, adminToolHandlers } = require("./aiTools/adminTools");
const { teacherToolDeclarations, teacherToolHandlers } = require("./aiTools/teacherTools");
const { studentToolDeclarations, studentToolHandlers } = require("./aiTools/studentTools");
const { parentToolDeclarations, parentToolHandlers } = require("./aiTools/parentTools");

// ─── Role Config ───────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  superadmin: {
    declarations: adminToolDeclarations,
    handlers: adminToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping the Super Admin.
You have access to school-wide data: students, teachers, classes, attendance, fees, and exam results.
Be concise, professional, and data-driven. Format numbers clearly. Use bullet points for lists.`,
  },
  admin: {
    declarations: adminToolDeclarations,
    handlers: adminToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping the Admin.
You have access to school data: students, teachers, classes, attendance, fees, and results.
Be concise, professional, and helpful. Use data to give accurate answers.`,
  },
  teacher: {
    declarations: teacherToolDeclarations,
    handlers: teacherToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping a Teacher.
You can only access data for classes and students assigned to this teacher.`,
  },
  student: {
    declarations: studentToolDeclarations,
    handlers: studentToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping a Student.
You can only access this student's own profile, attendance, results, and fee status.
Be encouraging and supportive.`,
  },
  parent: {
    declarations: parentToolDeclarations,
    handlers: parentToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping a Parent.
You can only access data for children linked to this parent's account.
If the parent has multiple children and doesn't specify which one, ask for clarification.`,
  },
  accountant: {
    declarations: adminToolDeclarations,
    handlers: adminToolHandlers,
    systemPrompt: `You are an AI assistant for a School ERP system, helping the Accountant.
Focus on fee-related queries: collections, defaulters, and payment status.`,
  },
};

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";

// ─── Pre-load User Context ─────────────────────────────────────────────────
async function buildUserContext(userId, role, schoolId) {
  const context = { userId, role, schoolId };

  if (role === "teacher") {
    context.teacherRecord = await Teacher.findOne({ userId })
      .populate("assignedClasses", "className section")
      .lean();
  }

  if (role === "student") {
    context.studentRecord = await Student.findOne({ userId })
      .populate("classId", "className section")
      .lean();
  }

  if (role === "parent") {
    context.children = await Student.find({ guardianIds: userId })
      .populate("classId", "className section")
      .lean();
    context.parentUserId = userId;
  }

  return context;
}

// ─── Execute Tool ──────────────────────────────────────────────────────────
async function executeTool(toolName, toolArgs, handlers, userContext) {
  const handler = handlers[toolName];
  if (!handler) return { error: `Unknown tool: ${toolName}` };
  try {
    return await handler({ ...toolArgs, ...userContext });
  } catch (err) {
    console.error(`[AI Tool Error] ${toolName}:`, err.message);
    return { error: `Tool failed: ${err.message}` };
  }
}

// ─── Main Chat Function ────────────────────────────────────────────────────
async function processChat(userId, role, schoolId, userMessage) {
  const roleConfig = ROLE_CONFIG[role];
  if (!roleConfig) {
    return { reply: "AI assistant is not available for your role." };
  }

  // 1. Load or create conversation
  let conversation = await ChatConversation.findOne({ userId, role });
  if (!conversation) {
    conversation = new ChatConversation({ userId, role, schoolId });
  }

  if (conversation.messages.length === 0) {
    conversation.title = userMessage.slice(0, 60);
  }

  // 2. Build scoped user context
  const userContext = await buildUserContext(userId, role, schoolId);

  // 3. Build contents array from history + new message
  const contents = [
    ...conversation.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  // 4. Save user message
  conversation.messages.push({ role: "user", content: userMessage });

  // 5. Function-calling loop (max 5 turns)
  let finalText = "";

  try {
    let iterations = 0;

    while (iterations < 5) {
      iterations++;

      const data = await generateContent({
        model: MODEL(),
        contents,
        systemInstruction: roleConfig.systemPrompt,
        tools: roleConfig.declarations,
      });

      const { text, functionCalls, parts } = parseResponse(data);

      // No function calls → final answer
      if (functionCalls.length === 0) {
        finalText = text;
        break;
      }

      // Append model's function-call turn to contents
      contents.push({ role: "model", parts });

      // Execute all tools and collect results
      const toolResultParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        const result = await executeTool(name, args || {}, roleConfig.handlers, userContext);
        toolResultParts.push({
          functionResponse: { name, response: { result } },
        });
      }

      // Append tool results as next user turn
      contents.push({ role: "user", parts: toolResultParts });
    }
  } catch (geminiErr) {
    console.error("[AI] Gemini error:", geminiErr.message);

    // Roll back the unsaved user message
    conversation.messages.pop();
    await conversation.save();

    if (
      geminiErr.message?.includes("ECONNRESET") ||
      geminiErr.message?.includes("aborted") ||
      geminiErr.message?.includes("stream") ||
      geminiErr.message?.includes("ETIMEDOUT")
    ) {
      return { reply: "Network issue with AI service. Please try again." };
    }

    return { reply: `AI error: ${geminiErr.message.slice(0, 100)}` };
  }

  if (!finalText) {
    finalText = "I couldn't generate a response. Please try rephrasing your question.";
  }

  // 6. Save assistant reply
  conversation.messages.push({ role: "model", content: finalText });
  await conversation.save();

  return { reply: finalText, conversationId: conversation._id };
}

// ─── Clear / History ───────────────────────────────────────────────────────
async function clearConversation(userId, role) {
  await ChatConversation.findOneAndUpdate(
    { userId, role },
    { messages: [], title: "New Chat" }
  );
}

async function getConversationHistory(userId, role) {
  const conv = await ChatConversation.findOne({ userId, role }).lean();
  return conv ? conv.messages : [];
}

module.exports = { processChat, clearConversation, getConversationHistory };
