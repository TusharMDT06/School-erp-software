import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Bot,
  X,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  ChevronDown,
  User,
} from "lucide-react";
import { sendChatMessage, getChatHistory, clearChatHistory } from "../../api/aiApi";
import ReactMarkdown from "react-markdown";

// Markdown renderer for AI responses
const MessageContent = ({ content }) => (
  <div className="ai-markdown text-[13px] leading-relaxed">
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-0.5 mb-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-0.5 mb-1">{children}</ol>
        ),
        li: ({ children }) => <li className="text-[13px]">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        code: ({ children }) => (
          <code className="bg-black/10 rounded px-1 py-0.5 text-[11px] font-mono">
            {children}
          </code>
        ),
        h1: ({ children }) => (
          <h1 className="font-bold text-sm mb-1">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-bold text-[13px] mb-1">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold text-[13px] mb-0.5">{children}</h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

// Role-specific greeting messages
const ROLE_GREETINGS = {
  admin: "Hi! I'm your School ERP Assistant. Ask me about students, teachers, attendance, fees, or exam results.",
  superadmin: "Hi! I'm your School ERP Assistant. I have full access to school-wide data. What would you like to know?",
  teacher: "Hi! I'm your teaching assistant. Ask me about your classes, students' attendance, or exam results.",
  student: "Hi! I'm your personal school assistant. Ask me about your attendance, results, or fee status.",
  parent: "Hi! I'm here to help you stay updated on your child's academics, attendance, and fees.",
  accountant: "Hi! I'm your finance assistant. Ask me about fee collections, defaulters, or payment status.",
};

const ROLE_COLORS = {
  admin: "from-[#1F4E79] to-[#2563a8]",
  superadmin: "from-purple-600 to-purple-800",
  teacher: "from-emerald-600 to-emerald-800",
  student: "from-sky-500 to-sky-700",
  parent: "from-amber-500 to-amber-700",
  accountant: "from-rose-500 to-rose-700",
};

const ROLE_ACCENT = {
  admin: "bg-[#1F4E79]",
  superadmin: "bg-purple-600",
  teacher: "bg-emerald-600",
  student: "bg-sky-500",
  parent: "bg-amber-500",
  accountant: "bg-rose-500",
};

const SUGGESTED_PROMPTS = {
  admin: [
    "Give me a school overview",
    "Show fee defaulters",
    "Top scorers in last exam",
    "Today's attendance summary",
  ],
  superadmin: [
    "School overview stats",
    "List all classes",
    "Fee collection summary",
    "Show fee defaulters",
  ],
  teacher: [
    "Show my assigned classes",
    "List my students",
    "Attendance summary this month",
    "Student results overview",
  ],
  student: [
    "Show my attendance",
    "My latest exam results",
    "My fee status",
    "My profile details",
  ],
  parent: [
    "My child's attendance",
    "Latest exam results",
    "Fee payment status",
    "Show my children",
  ],
  accountant: [
    "Fee collection summary",
    "Show defaulters list",
    "Pending fee count",
    "School overview",
  ],
};

const AIChatWidget = () => {
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const role = user?.role || "admin";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getChatHistory();
      const history = res.data?.data?.messages || [];
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        );
        setShowSuggestions(false);
      }
    } catch (err) {
      // Fail silently — fresh conversation
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    setInput("");
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await sendChatMessage(text);
      const reply = res.data?.data?.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: "model", content: reply }]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "model", content: `⚠️ ${errMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
      setShowSuggestions(true);
    } catch (err) {
      // Fail silently
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = SUGGESTED_PROMPTS[role] || SUGGESTED_PROMPTS.admin;
  const greeting = ROLE_GREETINGS[role] || ROLE_GREETINGS.admin;
  const gradient = ROLE_COLORS[role] || ROLE_COLORS.admin;
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.admin;

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        id="ai-chat-trigger"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br ${gradient} shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:shadow-xl group ${isOpen ? "hidden" : "flex"}`}
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          id="ai-chat-window"
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-48px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 bg-white animate-in slide-in-from-bottom-4 duration-300"
          style={{ animation: "slideUp 0.25s ease-out" }}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center gap-3 flex-shrink-0`}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-none">AI Assistant</p>
              <p className="text-white/70 text-xs mt-0.5 capitalize">{role} Portal</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                id="ai-chat-clear"
                onClick={handleClear}
                title="Clear conversation"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                id="ai-chat-close"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* Welcome message */}
                {messages.length === 0 && (
                  <div className="flex gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${accent} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-slate-100 max-w-[85%]">
                      <p className="text-[13px] text-slate-700 leading-relaxed">{greeting}</p>
                    </div>
                  </div>
                )}

                {/* Conversation messages */}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        msg.role === "user"
                          ? "bg-slate-200"
                          : accent
                      }`}
                    >
                      {msg.role === "user" ? (
                        user?.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        )
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[82%] px-3 py-2.5 rounded-2xl shadow-sm ${
                        msg.role === "user"
                          ? `bg-gradient-to-br ${gradient} text-white rounded-tr-sm`
                          : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="text-[13px] leading-relaxed">{msg.content}</p>
                      ) : (
                        <MessageContent content={msg.content} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading dots */}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${accent} flex items-center justify-center flex-shrink-0`}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Suggested Prompts */}
          {showSuggestions && messages.length === 0 && !isLoading && (
            <div className="px-3 pb-2 flex-shrink-0 bg-slate-50/50">
              <p className="text-[11px] text-slate-400 font-medium mb-1.5 px-1">Suggested questions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-left text-[11px] text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-2.5 py-2 transition-all duration-150 leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 px-3 pb-3 pt-2 bg-white border-t border-slate-100">
            <div className="flex items-end gap-2">
              <textarea
                id="ai-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                rows={1}
                className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all max-h-32 leading-relaxed"
                style={{ minHeight: "42px" }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                }}
              />
              <button
                id="ai-chat-send"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? `bg-gradient-to-br ${gradient} text-white shadow-md hover:shadow-lg hover:scale-105`
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

export default AIChatWidget;
