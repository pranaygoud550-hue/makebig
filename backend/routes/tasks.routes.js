import { Router } from "express";
// import * as tasksController from "../controllers/tasks.controller.js";
// import { authMiddleware } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

// Mounted at /api/projects/:projectId/tasks
// TODO: move handlers from legacy.routes.js
// router.get("/", authMiddleware, tasksController.list);
// router.post("/", authMiddleware, tasksController.create);
// router.put("/:taskId", authMiddleware, tasksController.update);
// router.delete("/:taskId", authMiddleware, tasksController.remove);

export default router;
