import express from "express";
import cors from "cors";
import morgan from "morgan";

import { auth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.routes.js";
import boardsRoutes from "./routes/boards.routes.js";
import listsRoutes from "./routes/lists.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/boards", auth, boardsRoutes);
  app.use("/api/lists", auth, listsRoutes);
  app.use("/api/tasks", auth, tasksRoutes);

  return app;
}
