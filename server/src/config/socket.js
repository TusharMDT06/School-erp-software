const { Server } = require("socket.io");

let io = null;

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
