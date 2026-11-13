import { Kysely, sql } from "kysely";

// Add full-text search over listing titles and descriptions
export async function up(db: Kysely<any>): Promise<void> {
  // Postgres keeps this column up to date whenever a listing is added or edited.
  // Title words (weight A) count more than description words (weight B) when ranking.
  await sql`
    ALTER TABLE listings
    ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
  `.execute(db);

  // GIN inverted index so searches don't scan every listing
  await db.schema
    .createIndex("listings_search_vector_idx")
    .on("listings")
    .using("gin")
    .column("search_vector")
    .execute();
}

// Undo these changes if necessary
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("listings_search_vector_idx").execute();
  await db.schema.alterTable("listings").dropColumn("search_vector").execute();
}
