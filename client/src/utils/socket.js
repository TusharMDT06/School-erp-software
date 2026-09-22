import { io } from "socket.io-client";

let socket = null;

/**
 * Initialize or retrieve the Socket.io client instance.
 */
export const getSocket = () => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("⚡ Connected to WebSocket server:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("WebSocket connection warning:", err.message);
    });
  }
  return socket;
};

/**
 * Join a user-specific room when authenticated.
 */
export const joinUserRoom = (userId) => {
  if (!userId) return;
  const s = getSocket();
  if (s.connected) {
    s.emit("join", userId);
  } else {
    s.once("connect", () => {
      s.emit("join", userId);
    });
  }
};

/**
 * Disconnect socket on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
