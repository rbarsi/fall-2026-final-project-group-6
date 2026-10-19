
import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

// This package stores login sessions in PostgreSQL
const PgSession = connectPgSimple(session);

// Connect to the same PostgreSQL database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Get our secret from the .env file
const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error("SESSION_SECRET is missing from .env");
}

// Configure Express sessions
export const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    createTableIfMissing: true
  }),
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24
  }
});
