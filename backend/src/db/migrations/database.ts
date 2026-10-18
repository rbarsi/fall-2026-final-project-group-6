
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface UserTable {
    // '?' on id allows for id to be handled by the database
    id?: number;
    email: string;
    username: string;
    created_at?: Date;
}

export interface ListingTable {
    id?: number;
    title: string;
    description: string;
    price: string;
    user_id: number;
    created_at?: Date;
}

export interface CommentTable {
    id?: number;
    content: string;
    user_id: number;
    listing_id: number;
    created_at?: Date;
}

export interface Database {
    users: UserTable;
    listings: ListingTable;
    comments: CommentTable;
}

export const db = new Kysely<Database>({
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
});