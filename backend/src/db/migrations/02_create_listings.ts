import { AddColumnNode, Kysely, SqliteDialect, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
 await db.schema
    .alterTable('listings')
    .addColumn('status', 'varchar(50)', (col) => col.defaultTo('lost').notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
    .alterTable('listings')
    .dropColumn('status')
    .execute();
}