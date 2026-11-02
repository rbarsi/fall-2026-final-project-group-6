import { Kysely } from "kysely";

// Add location and date to listings
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("listings")
    .addColumn("location", "varchar(255)")
    .addColumn("listing_date", "date")
    .execute();
}

// Undo these changes if necessary
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("listings")
    .dropColumn("location")
    .dropColumn("listing_date")
    .execute();
}
