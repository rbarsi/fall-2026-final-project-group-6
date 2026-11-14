
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll
} from "vitest";

import request from "supertest";
import pg from "pg";
import type { Express } from "express";
import type { Kysely } from "kysely";

let app: Express;
let pool: pg.Pool;
let database: Kysely<any>;
let sessionPool: pg.Pool;

// Test account
const testUser = {
  name: "Test Student",
  email: "teststudent@example.com",
  password: "password123"
};

// Test listing
const testListing = {
  title: "Lost Water Bottle",
  description: "Black bottle with stickers",
  category: "Water Bottles",
  status: "lost",
  // Set to the Atkins Library campus location in beforeAll
  location_id: 0,
  listing_date: "2026-11-02"
};

// Run once before testing
beforeAll(async () => {
  const testUrl = process.env.TEST_DATABASE_URL;

  // Require a separate test database
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is missing");
  }

  const databaseName = new URL(testUrl).pathname;

  if (databaseName !== "/campus_lost_found_test") {
    throw new Error("Tests must use campus_lost_found_test");
  }

  // Configure the environment BEFORE loading the app
  process.env.DATABASE_URL = testUrl;
  process.env.SESSION_SECRET =
    "this-is-only-a-test-session-secret";
  process.env.NODE_ENV = "test";

  // Import after the environment is configured
 const appModule = await import("../src/app.js");
const dbModule = await import("../src/db/database.js");
const sessionModule = await import("../src/session.js");

  app = appModule.app;
  database = dbModule.db;
  sessionPool = sessionModule.sessionPool;

  // Database connection for checking test records
  pool = new pg.Pool({
    connectionString: testUrl
  });

  // Campus locations come from a migration, so look up the test location's ID
  const atkins = await pool.query(
    "SELECT id FROM campus_locations WHERE name = $1",
    ["Atkins Library"]
  );

  testListing.location_id = atkins.rows[0].id;
});

// Clean test data before every test
beforeEach(async () => {
  await pool.query(
    "TRUNCATE TABLE users, listings, comments RESTART IDENTITY CASCADE"
  );
});

// Clean up after all tests
afterAll(async () => {
  if (pool) {
    await pool.query(
      "TRUNCATE TABLE users, listings, comments RESTART IDENTITY CASCADE"
    );
    await pool.end();
  }

  if (database) {
    await database.destroy();
  }

  if (sessionPool) {
    await sessionPool.end();
  }
});

// SIGNUP TESTS

describe("Signup API", () => {

  it("creates a new user", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(testUser.email);

    // Password should not appear in the response
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it("rejects missing fields", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        email: "missing@example.com"
      });

    expect(response.status).toBe(400);
  });

  it("rejects duplicate emails", async () => {
    // Create the first account
    const first = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(first.status).toBe(201);

    // Try the same email again
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Another Student",
        email: testUser.email,
        password: "anotherpassword123"
      });

    expect(response.status).toBe(409);
  });

  it("stores hashed passwords", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    expect(response.status).toBe(201);

    // Read the saved password hash
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [testUser.email]
    );

    const savedHash = result.rows[0].password_hash;

    // The saved value must not be the original password
    expect(savedHash).not.toBe(testUser.password);

    // Check bcrypt hash format
    expect(savedHash).toMatch(/^\$2[aby]\$/);
  });
});

// LOGIN AND SESSION TESTS

describe("Login API", () => {

  it("logs in with correct credentials", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("rejects an incorrect password", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "wrongpassword"
      });

    expect(response.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "unknown@example.com",
        password: "password123"
      });

    expect(response.status).toBe(401);
  });

  it("keeps the user logged in across requests", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    // Agent automatically remembers session cookies
    const agent = request.agent(app);

    const login = await agent
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(login.status).toBe(200);

    // Use the same session for another request
    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(testUser.email);
  });

  it("ends the session after logout", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password
    });

    const logout = await agent.post("/api/auth/logout");

    expect(logout.status).toBe(200);

    // The old session should no longer work
    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(401);
  });
});

// LISTINGS API TESTS

describe("Listings API", () => {

  it("rejects listing creation without login", async () => {
    const response = await request(app)
      .post("/api/listings")
      .send(testListing);

    expect(response.status).toBe(401);
  });

  it("creates a listing when logged in", async () => {
    // Create account
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    // Log in and remember the session
    const agent = request.agent(app);

    const login = await agent
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(login.status).toBe(200);

    // Create listing
    const response = await agent
      .post("/api/listings")
      .send(testListing);

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Lost Water Bottle");
    expect(response.body.location).toBe("Atkins Library");
    expect(response.body.status).toBe("lost");

    // Check creator association
    expect(response.body.user_id).toBe(login.body.user.id);
  });

  it("retrieves all listings", async () => {
    const response = await request(app)
      .get("/api/listings");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("retrieves a listing by ID", async () => {
    // Create a test user
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password
    });

    // Create a listing to retrieve
    const created = await agent
      .post("/api/listings")
      .send(testListing);

    expect(created.status).toBe(201);

    const listingId = created.body.id;

    // Retrieve the same listing
    const response = await request(app)
      .get(`/api/listings/${listingId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(listingId);
    expect(response.body.title).toBe("Lost Water Bottle");
  });

  it("returns 400 for an invalid listing ID", async () => {
    const response = await request(app)
      .get("/api/listings/abc");

    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing listing", async () => {
    const response = await request(app)
      .get("/api/listings/999999");

    expect(response.status).toBe(404);
  });

  it("rejects missing listing information", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send(testUser);

    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password
    });

    // Missing category, location, date, and status
    const response = await agent
      .post("/api/listings")
      .send({
        title: "Lost Keys",
        description: "Lost near the library"
      });

    expect(response.status).toBe(400);
  });
});

// CAMPUS LOCATION TESTS

// Sign up and log in, returning an agent that keeps the session
async function loginAs(user: typeof testUser) {
  await request(app).post("/api/auth/signup").send(user);

  const agent = request.agent(app);

  await agent.post("/api/auth/login").send({
    email: user.email,
    password: user.password
  });

  return agent;
}

describe("Campus locations", () => {

  it("lists campus locations with coordinates", async () => {
    const response = await request(app).get("/api/locations");

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    const atkins = response.body.find(
      (location: { name: string }) => location.name === "Atkins Library"
    );

    expect(atkins.id).toBe(testListing.location_id);
    expect(typeof atkins.latitude).toBe("number");
    expect(typeof atkins.longitude).toBe("number");
  });

  it("saves the chosen location and its coordinates", async () => {
    const agent = await loginAs(testUser);

    const created = await agent.post("/api/listings").send(testListing);

    expect(created.status).toBe(201);
    expect(created.body.location_id).toBe(testListing.location_id);
    expect(created.body.location).toBe("Atkins Library");
    expect(typeof created.body.latitude).toBe("number");

    // The location is still there when the listing is loaded again
    const response = await request(app)
      .get(`/api/listings/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body.location).toBe("Atkins Library");
    expect(response.body.latitude).toBe(created.body.latitude);
    expect(response.body.longitude).toBe(created.body.longitude);
  });

  it("rejects a location that does not exist", async () => {
    const agent = await loginAs(testUser);

    const unknown = await agent
      .post("/api/listings")
      .send({ ...testListing, location_id: 999999 });

    expect(unknown.status).toBe(400);

    const notANumber = await agent
      .post("/api/listings")
      .send({ ...testListing, location_id: "abc" });

    expect(notANumber.status).toBe(400);
  });

  it("lets the owner change the location", async () => {
    const agent = await loginAs(testUser);

    const created = await agent.post("/api/listings").send(testListing);

    const locations = await request(app).get("/api/locations");
    const other = locations.body.find(
      (location: { id: number }) => location.id !== testListing.location_id
    );

    const update = await agent
      .put(`/api/listings/${created.body.id}`)
      .send({ location_id: other.id });

    expect(update.status).toBe(200);

    const response = await request(app)
      .get(`/api/listings/${created.body.id}`);

    expect(response.body.location_id).toBe(other.id);
    expect(response.body.location).toBe(other.name);
    expect(response.body.latitude).toBe(other.latitude);
  });

  it("rejects changing to an invalid location", async () => {
    const agent = await loginAs(testUser);

    const created = await agent.post("/api/listings").send(testListing);

    const response = await agent
      .put(`/api/listings/${created.body.id}`)
      .send({ location_id: 999999 });

    expect(response.status).toBe(400);
  });

  it("does not let another user change the location", async () => {
    const owner = await loginAs(testUser);
    const created = await owner.post("/api/listings").send(testListing);

    const stranger = await loginAs({
      name: "Other Student",
      email: "otherstudent@example.com",
      password: "password123"
    });

    const response = await stranger
      .put(`/api/listings/${created.body.id}`)
      .send({ location_id: testListing.location_id });

    expect(response.status).toBe(403);
  });
});

// KEYWORD SEARCH TESTS

// Post the three listings the search tests look for
async function createSearchListings() {
  const agent = await loginAs(testUser);

  // "bottle" is in the title
  await agent.post("/api/listings").send(testListing);

  // "bottle" is only in the description
  await agent.post("/api/listings").send({
    ...testListing,
    title: "Blue Backpack",
    description: "Has a water bottle in the side pocket",
    category: "Bags"
  });

  // No "bottle" at all
  await agent.post("/api/listings").send({
    ...testListing,
    title: "Car Keys",
    description: "Toyota key on a red lanyard",
    category: "Keys",
    status: "found"
  });
}

function titlesOf(response: { body: { title: string }[] }) {
  return response.body.map((listing) => listing.title);
}

describe("Keyword search", () => {

  it("finds listings by words in the title or description", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "bottle" });

    expect(response.status).toBe(200);
    expect(titlesOf(response)).toHaveLength(2);
    expect(titlesOf(response)).toContain("Lost Water Bottle");
    expect(titlesOf(response)).toContain("Blue Backpack");
  });

  it("ranks title matches above description matches", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "bottle" });

    expect(titlesOf(response)).toEqual(["Lost Water Bottle", "Blue Backpack"]);
  });

  it("matches other forms of a word", async () => {
    await createSearchListings();

    // "keys" should find "key" and "Keys"
    const response = await request(app)
      .get("/api/listings")
      .query({ q: "keys" });

    expect(titlesOf(response)).toEqual(["Car Keys"]);
  });

  it("returns an empty list when nothing matches", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "umbrella" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns every listing when the search is empty", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "   " });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  it("handles unusual search text without errors", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "\"water & | ! ( bottle" });

    expect(response.status).toBe(200);
  });

  it("rejects searches that are too long", async () => {
    const response = await request(app)
      .get("/api/listings")
      .query({ q: "a".repeat(201) });

    expect(response.status).toBe(400);
  });

  it("does not include the search column in responses", async () => {
    await createSearchListings();

    const response = await request(app)
      .get("/api/listings")
      .query({ q: "bottle" });

    expect(response.body[0].search_vector).toBeUndefined();
  });
});
