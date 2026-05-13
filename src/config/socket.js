import { Server } from "socket.io";
import { env } from "./env.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
    path: "/ws",
  });

  io.on("connection", (socket) => {
    socket.on("join-admin", () => {
      socket.join("admin");
    });

    socket.on("join-user", (userId) => {
      if (userId) socket.join(`user-${userId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToAdmin(event, data) {
  if (io) {
    io.to("admin").emit(event, data);
  }
}

export function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user-${userId}`).emit(event, data);
  }
}
