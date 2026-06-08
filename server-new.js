import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __rootDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__rootDir, "backend/.env"), override: true });

import { createApp } from "./backend/app/createApp.js";
import { mountApiRoutes } from "./backend/routes/index.js";
import { startServer } from "./backend/app/startServer.js";

const ctx = createApp();
ctx.rootDir = __rootDir;
mountApiRoutes(ctx);

export default ctx.app;

if (process.env.SKIP_SERVER_START !== "true") {
  startServer(ctx).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
