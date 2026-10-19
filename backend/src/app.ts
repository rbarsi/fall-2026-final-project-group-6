import express from "express";
import { sql } from "kysely";
import { db } from "./db/database.js";
//new imports
import { sessionMiddleware } from "./session.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";

export const app = express();
app.use(express.json());
//new
app.use(sessionMiddleware);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/health/database", async (_req, res) => {
  try {
    await sql`select 1`.execute(db);
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

//new things added
app.use("/api/auth", authRouter);
app.post("/api/listings", requireAuth, (_req, res) => {
  res.json({
    message: "You are allowed to create a listing"
  });
});
