import express from "express";
import { sql } from "kysely";
import { db } from "./db/database.js";

export const app = express();
app.use(express.json());
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
