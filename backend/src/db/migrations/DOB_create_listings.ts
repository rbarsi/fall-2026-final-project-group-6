import { AddColumnNode, Kysely, SqliteDialect, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
 await db.schema.createTable('listings').addColumn('id', 'serial', (col) => col.primaryKey()).addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade').notNull())
 .addColumn('title', 'varchar(255)', (col) => col.notNull()).addColumn('description', 'text', (col) => col.notNull()).addColumn('category', 'varchar(50)', (col) => col.notNull())
 .addColumn('status', 'varchar(50)', (col) => col.defaultTo('lost').notNull()).addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('listings').execute();
}