
import { cp } from 'fs'
import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('username', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .execute();

    // Table listings
    await db.schema
    .createTable('listings')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.notNull())
    .addColumn('price', 'numeric(10, 2)', (col) => col.notNull())
    .addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()).execute();

    // Comments table
    await db.schema
    .createTable('comments')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('user_id', 'integer', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('listing_id', 'integer', (col) => col.references('listings.id').onDelete('cascade').notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .execute();
}

    export async function down(db: Kysely<any>): Promise<void> {
        await db.schema.dropTable('comments').execute();
        await db.schema.dropTable('listings').execute();
        await db.schema.dropTable('users').execute();
    }