import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgSession = connectPgSimple(session);

export const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error("SESSION_SECRET is missing from .env");
}

export const sessionStore = new PgSession({
  pool: sessionPool,
  createTableIfMissing: true,
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});
