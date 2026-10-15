import "dotenv/config";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

// Replace this empty interface with table types when migrations are added.
export interface Database {}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy backend/.env.example to backend/.env.");
}
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }) }),
});
