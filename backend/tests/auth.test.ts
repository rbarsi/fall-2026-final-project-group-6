import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { sql } from "kysely";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/db/database.js";
import { sessionPool, sessionStore } from "../src/session.js";

const uniqueId = randomUUID();
const email = `ci-${uniqueId}@example.com`;
const name = `ci-${uniqueId}`;
const password = "TestPassword123!";
const agent = request.agent(app);

afterAll(async () => {
  try {
    await sql`DELETE FROM users WHERE email = ${email}`.execute(db);
  } finally {
    sessionStore.close();
    await Promise.all([sessionPool.end(), db.destroy()]);
  }
});

describe("Backend health", () => {
  it("responds to the health check", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("connects to Postgres", async () => {
    const response = await request(app).get("/api/health/database");
    expect(response.status).toBe(200);
    expect(response.body.database).toBe("connected");
  });
});

describe("Authentication", () => {
  it("rejects signup with missing fields", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ email });
    expect(response.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name, email: "invalid-email", password });
    expect(response.status).toBe(400);
  });

  it("rejects a short password", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name, email, password: "short" });
    expect(response.status).toBe(400);
  });

  it("creates an account and stores a hashed password", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name, email, password });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("password_hash");

    const result = await sql<{ password_hash: string }>`
      SELECT password_hash FROM users WHERE email = ${email}
    `.execute(db);

    const hash = result.rows[0]?.password_hash;
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash!)).toBe(true);
  });

  it("rejects a duplicate email", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ name, email, password });
    expect(response.status).toBe(409);
  });

  it("rejects an unregistered email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: `unknown-${uniqueId}@example.com`,
        password,
      });
    expect(response.status).toBe(401);
  });

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword123!" });
    expect(response.status).toBe(401);
  });

  it("requires authentication to access the current user", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("requires authentication for the listing endpoint", async () => {
    const response = await request(app)
      .post("/api/listings")
      .send({});
    expect(response.status).toBe(401);
  });

  it("maintains a login session and invalidates it on logout", async () => {
    const login = await agent
      .post("/api/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
    expect(login.body.user).not.toHaveProperty("password_hash");

    const currentUser = await agent.get("/api/auth/me");
    expect(currentUser.status).toBe(200);
    expect(currentUser.body.user.email).toBe(email);

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);

    const afterLogout = await agent.get("/api/auth/me");
    expect(afterLogout.status).toBe(401);
  });
});
