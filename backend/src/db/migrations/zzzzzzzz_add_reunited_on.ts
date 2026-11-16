import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('listings')
        .addColumn('reunited_on', 'date')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('listings')
        .dropColumn('reunited_on')
        .execute();
}