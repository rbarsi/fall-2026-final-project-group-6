import "dotenv/config";
import { app } from "./app.js";
import { db } from "./db/database.js";
import { sql } from "kysely";
import cors from "cors";

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

const port = Number(process.env.PORT ?? 3000);

async function startServer() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT null,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'lost' NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  );`
    .execute(db);

   // await sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS category VARCHAR(255);`.execute(db);
    console.log("Database schema checked: category column is ready.");
  } catch (err) {
    console.error("Schema check error:", err);
  }
}

const server = app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => { void db.destroy().then(() => process.exit(0)); });
  });
}

startServer();
