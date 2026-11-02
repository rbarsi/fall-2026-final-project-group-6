import express from "express";
import { sql } from "kysely";
import { db } from "./db/database.js";

//new imports
import { sessionMiddleware } from "./session.js";
import { authRouter } from "./routes/auth.js";
import cors from 'cors';
import { router as listingsRouter} from './routes/listings.js'

import { requireAuth } from "./middleware/requireAuth.js";
import { profileRouter } from "./routes/profile.js";
export const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

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
app.use("/api/profile", profileRouter);
app.use("/api/listings", listingsRouter);
