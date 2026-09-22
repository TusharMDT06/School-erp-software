const { Server } = require("socket.io");

let io = null;

/**
 * Initialize Socket.io with the HTTP server instance.
 * Supports CORS configuration matching Express app.
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
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
