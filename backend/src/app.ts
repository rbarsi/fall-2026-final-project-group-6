import express from "express";
import { sql } from "kysely";
import { db } from "./db/database.js";
-
sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS category VARCHAR(255);`
.execute(db)
.catch((err) => console.log("column check:", err.message));

sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'lost';`
.execute(db)
.catch((err) => console.log("status column check:", err.message));

//new imports
import { sessionMiddleware } from "./session.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";
import cors from 'cors';
import { router as listingsRouter} from '../src/routes/listings.js'
import { error } from "console";

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

app.use("/api/listings", listingsRouter);
/*
// put requireAuth after example account has been created
// put after ", and before (_req
app.post("/api/listings", (_req, res) => {
  res.json({
    message: "You are allowed to create a listing"
  });
});*/