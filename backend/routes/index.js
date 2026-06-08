import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import projectsRoutes from "./projects.routes.js";
import tasksRoutes from "./tasks.routes.js";
import invitesRoutes from "./invites.routes.js";
import { registerLegacyRoutes } from "./legacy.routes.js";

/**
 * Mount feature routers, then any routes not yet migrated.
 * Pattern: thin route file → controller → models/services.
 */
export function mountApiRoutes(ctx) {
  const { app } = ctx;

  app.use("/api/auth", authRoutes);

  // Uncomment as you migrate each feature out of legacy.routes.js:
  // app.use("/api/users", usersRoutes);
  // app.use("/api/projects", projectsRoutes);
  // app.use("/api/projects/:projectId/tasks", tasksRoutes);
  // app.use("/api/invites", invitesRoutes);

  registerLegacyRoutes(ctx);
}
