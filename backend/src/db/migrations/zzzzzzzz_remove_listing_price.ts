import { Kysely, sql } from "kysely";

// Remove the old price column if it exists
export async function up(db: Kysely<any>): Promise<void> {
    await sql`
        ALTER TABLE listings
        DROP COLUMN IF EXISTS price
    `.execute(db);
}

// Restore the column if the migration is rolled back
export async function down(db: Kysely<any>): Promise<void> {
    await sql`
        ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS price numeric(10, 2)
        NOT NULL DEFAULT 0
    `.execute(db);
}
