import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { corsMiddleware, socketCorsOptions } from "../middleware/cors.js";

/**
 * Build Express + HTTP + Socket.io. No DB connection or route registration here.
 */
export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: socketCorsOptions,
    transports: ["websocket", "polling"],
  });

  app.use(corsMiddleware);
  app.use(express.json({ limit: "2mb" }));

  return { app, httpServer, io };
}
