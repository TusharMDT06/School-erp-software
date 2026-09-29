const { Server } = require("socket.io");

let io = null;
const autoReplyDailyTracker = new Set();

/**
 * Initialize Socket.io with the HTTP server instance.
 * Supports CORS configuration matching Express app.
 */
const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""));

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        if (
          allowedOrigins.includes(cleanOrigin) ||
          allowedOrigins.includes("*") ||
          cleanOrigin.endsWith(".onrender.com") ||
          process.env.NODE_ENV !== "production"
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Client joins their personal room e.g. user:66123abc...
    socket.on("join", (userId) => {
      if (userId) {
        const room = `user:${userId}`;
        socket.join(room);
      }
    });

    // Send direct message with teacher office hours auto-reply
    socket.on("send_message", async (data) => {
      try {
        const { toUserId, conversationId, message, senderId, senderRole } = data || {};
        if (!toUserId || !message) return;

        // Forward message to recipient's room
        io.to(`user:${toUserId}`).emit("receive_message", {
          ...data,
          timestamp: new Date(),
        });

        // If parent messages a teacher outside office hours, trigger auto-reply (max 1/day)
        if (senderRole === "parent") {
          try {
            const Teacher = require("../models/Teacher.model");
            const TeacherPreference = require("../models/TeacherPreference.model");

            const teacher = await Teacher.findOne({ userId: toUserId });
            if (teacher) {
              const pref = await TeacherPreference.findOne({ teacherId: teacher._id });
              if (pref && pref.autoReplyEnabled) {
                const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                const todayName = days[new Date().getDay()];
                const todayHours = pref.officeHours?.find((h) => h.day === todayName && h.enabled);

                let isInsideOfficeHours = false;
                if (todayHours && todayHours.start && todayHours.end) {
                  const now = new Date();
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const [sH, sM] = todayHours.start.split(":").map(Number);
                  const [eH, eM] = todayHours.end.split(":").map(Number);
                  const startMinutes = sH * 60 + sM;
                  const endMinutes = eH * 60 + eM;
                  isInsideOfficeHours = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                }

                if (!isInsideOfficeHours) {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const autoReplyKey = `${conversationId || `${senderId}_${toUserId}`}:${todayStr}`;

                  if (!autoReplyDailyTracker.has(autoReplyKey)) {
                    autoReplyDailyTracker.add(autoReplyKey);

                    // Send auto-reply back to parent
                    io.to(`user:${senderId}`).emit("auto_reply", {
                      fromUserId: toUserId,
                      conversationId,
                      text: pref.autoReplyText || "Teacher is currently outside office hours.",
                      timestamp: new Date(),
                      isAutoReply: true,
                    });
                  }
                }
              }
            }
          } catch (prefErr) {
            console.warn("[Socket AutoReply Error]:", prefErr.message);
          }
        }
      } catch (msgErr) {
        console.warn("[Socket send_message Error]:", msgErr.message);
      }
    });

    socket.on("disconnect", () => {
      // Disconnected
    });
  });

  return io;
};

/**
 * Retrieve the active Socket.io instance.
 */
const getIO = () => io;

module.exports = { initSocket, getIO };
