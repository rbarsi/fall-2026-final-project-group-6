import express from "express";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { sql } from "kysely";
import { db } from "./db/database.js";

//new imports
import { sessionMiddleware } from "./session.js";
import { authRouter } from "./routes/auth.js";
import cors from 'cors';
import { router as listingsRouter} from './routes/listings.js'
import { router as locationsRouter } from './routes/locations.js'
import { router as commentsRouter } from "./routes/comments.js";
import { router as usersRouter } from "./routes/users.js";

import { requireAuth } from "./middleware/requireAuth.js";
import { profileRouter } from "./routes/profile.js";
export const app = express();

const isProduction = process.env.NODE_ENV === "production";

// The hosting service sends requests through a proxy over HTTPS.
// Trusting it lets Express see the HTTPS connection, so secure login cookies are sent.
if (isProduction) {
  app.set("trust proxy", 1);
}

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
app.use("/api/locations", locationsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/users", usersRouter);

// In production, Express also serves the built React app (frontend/dist).
// In development, Vite serves the frontend instead, so this does nothing.
const frontendDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

if (isProduction && existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // Send index.html for page addresses such as /search so React Router can show the right page
  app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
