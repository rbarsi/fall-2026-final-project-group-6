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

// First test account
const studentA = {
    name: "Student A",
    email: "studenta@example.com",
    password: "password123"
};

// Second test account
const studentB = {
    name: "Student B",
    email: "studentb@example.com",
    password: "password123"
};

// Test listing
const testListing = {
    title: "Lost Water Bottle",
    description: "Black water bottle",
    category: "Water Bottles",
    status: "lost",
    location_id: 1,
    listing_date: "2026-11-16"
};

// Set up the test database
beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;

    if (!testUrl) {
        throw new Error("TEST_DATABASE_URL is missing");
    }

    // Prevent using the normal development database
    if (
        new URL(testUrl).pathname !==
        "/campus_lost_found_test"
    ) {
        throw new Error("Must use the test database");
    }

    process.env.DATABASE_URL = testUrl;
    process.env.SESSION_SECRET = "test-only-session-secret";
    process.env.NODE_ENV = "test";

    const appModule = await import("../src/app.js");
    const dbModule = await import("../src/db/database.js");
    const sessionModule = await import("../src/session.js");

    app = appModule.app;
    database = dbModule.db;
    sessionPool = sessionModule.sessionPool;

    pool = new pg.Pool({
        connectionString: testUrl
    });
});

// Clean up test data
async function clearTestData() {
    await pool.query(
        "TRUNCATE TABLE comments, listings, users RESTART IDENTITY CASCADE"
    );

    // Clear sessions if the session table exists
    const result = await pool.query(
        "SELECT to_regclass('public.session') AS table_name"
    );

    if (result.rows[0].table_name) {
        await pool.query('TRUNCATE TABLE "session"');
    }
}

// Clean database before every test
beforeEach(async () => {
    await clearTestData();
});

// Clean database after all tests
afterAll(async () => {
    if (pool) {
        await clearTestData();
        await pool.end();
    }

    if (database) {
        await database.destroy();
    }

    if (sessionPool) {
        await sessionPool.end();
    }
});

// Helper function to create and log in a student
async function createStudent(student: typeof studentA) {
    const signup = await request(app)
        .post("/api/auth/signup")
        .send(student);

    expect(signup.status).toBe(201);

    const agent = request.agent(app);

    const login = await agent
        .post("/api/auth/login")
        .send({
            email: student.email,
            password: student.password
        });

    expect(login.status).toBe(200);

    return {
        agent: agent,
        id: login.body.user.id
    };
}

// Helper function to create a listing and comment
async function createTestComment() {
    const owner = await createStudent(studentA);

    const listing = await owner.agent
        .post("/api/listings")
        .send(testListing);

    expect(listing.status).toBe(201);

    const comment = await owner.agent
        .post("/api/comments")
        .send({
            content: "This is a test comment.",
            listing_id: listing.body.id
        });

    expect(comment.status).toBe(201);

    return {
        owner: owner,
        listingId: listing.body.id,
        commentId: comment.body.id
    };
}

// ISSUE #20 - COMMENT CRUD TESTS

describe("Comments API", () => {

    // Test 1: Create a comment
    it("creates a comment when logged in", async () => {
        const data = await createTestComment();

        const response = await data.owner.agent
            .post("/api/comments")
            .send({
                content: "Another test comment.",
                listing_id: data.listingId
            });

        expect(response.status).toBe(201);
        expect(response.body.content)
            .toBe("Another test comment.");
        expect(response.body.user_id)
            .toBe(data.owner.id);
        expect(response.body.listing_id)
            .toBe(data.listingId);
    });

    // Test 2: Retrieve comments
    it("retrieves comments for a listing", async () => {
        const data = await createTestComment();

        const response = await request(app)
            .get(`/api/comments/listing/${data.listingId}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(data.commentId);
    });

    // Test 3: Edit a comment
    it("allows authors to edit their comments", async () => {
        const data = await createTestComment();

        const response = await data.owner.agent
            .put(`/api/comments/${data.commentId}`)
            .send({
                content: "Updated comment"
            });

        expect(response.status).toBe(200);
        expect(response.body.content)
            .toBe("Updated comment");
    });

    // Test 4: Delete a comment
    it("allows authors to delete their comments", async () => {
        const data = await createTestComment();

        const response = await data.owner.agent
            .delete(`/api/comments/${data.commentId}`);

        expect(response.status).toBe(200);

        // Confirm the comment was deleted
        const comments = await request(app)
            .get(`/api/comments/listing/${data.listingId}`);

        expect(comments.status).toBe(200);
        expect(comments.body.length).toBe(0);
    });

    // Test 5: Reject an empty comment
    it("rejects empty comments", async () => {
        const data = await createTestComment();

        const response = await data.owner.agent
            .post("/api/comments")
            .send({
                content: "   ",
                listing_id: data.listingId
            });

        expect(response.status).toBe(400);
    });

    // Test 6: Reject editing a comment to empty text
    it("rejects editing a comment to empty text", async () => {
        const data = await createTestComment();

        const response = await data.owner.agent
            .put(`/api/comments/${data.commentId}`)
            .send({
                content: ""
            });

        expect(response.status).toBe(400);
    });

    // Test 7: Reject comments on missing listings
    it("rejects comments on nonexistent listings", async () => {
        const user = await createStudent(studentA);

        const response = await user.agent
            .post("/api/comments")
            .send({
                content: "Test comment",
                listing_id: 999999
            });

        expect(response.status).toBe(404);
    });
});

// ISSUE #21 - PERMISSIONS TESTS

describe("Permissions API", () => {

    // Test 8: Authentication required
    it("rejects comment creation without login", async () => {
        const data = await createTestComment();

        const response = await request(app)
            .post("/api/comments")
            .send({
                content: "Unauthorized comment",
                listing_id: data.listingId
            });

        expect(response.status).toBe(401);
    });

    // Test 9: Cannot edit another user's comment
    it("rejects edits to another user's comment", async () => {
        const data = await createTestComment();
        const other = await createStudent(studentB);

        const response = await other.agent
            .put(`/api/comments/${data.commentId}`)
            .send({
                content: "Unauthorized edit"
            });

        expect(response.status).toBe(403);

        // Make sure the original comment did not change
        const comments = await request(app)
            .get(`/api/comments/listing/${data.listingId}`);

        expect(comments.body[0].content)
            .toBe("This is a test comment.");
    });

    // Test 10: Cannot delete another user's comment
    it("rejects deleting another user's comment", async () => {
        const data = await createTestComment();
        const other = await createStudent(studentB);

        const response = await other.agent
            .delete(`/api/comments/${data.commentId}`);

        expect(response.status).toBe(403);

        const comments = await request(app)
            .get(`/api/comments/listing/${data.listingId}`);

        expect(comments.body.length).toBe(1);
    });

    // Test 11: Cannot edit another user's listing
    it("rejects editing another user's listing", async () => {
        const data = await createTestComment();
        const other = await createStudent(studentB);

        const response = await other.agent
            .put(`/api/listings/${data.listingId}`)
            .send({
                title: "Unauthorized title"
            });

        expect(response.status).toBe(403);

        const listing = await request(app)
            .get(`/api/listings/${data.listingId}`);

        expect(listing.body.title)
            .toBe(testListing.title);
    });

    // Test 12: Cannot delete another user's listing
    it("rejects deleting another user's listing", async () => {
        const data = await createTestComment();
        const other = await createStudent(studentB);

        const response = await other.agent
            .delete(`/api/listings/${data.listingId}`);

        expect(response.status).toBe(403);

        const listing = await request(app)
            .get(`/api/listings/${data.listingId}`);

        expect(listing.status).toBe(200);
    });

    // Test 13: Cannot edit another user's account
    it("rejects editing another user's account", async () => {
        const owner = await createStudent(studentA);
        const other = await createStudent(studentB);

        const response = await other.agent
            .put(`/api/users/${owner.id}`)
            .send({
                username: "Unauthorized Name"
            });

        expect(response.status).toBe(403);

        const profile = await request(app)
            .get(`/api/users/${owner.id}`);

        expect(profile.body.username).toBe(studentA.name);
    });

    // Test 14: Can edit your own account
    it("allows users to update their own account", async () => {
        const user = await createStudent(studentA);

        const response = await user.agent
            .put(`/api/users/${user.id}`)
            .send({
                username: "Updated Student"
            });

        expect(response.status).toBe(200);
        expect(response.body.username)
            .toBe("Updated Student");
    });

    // Test 15: Cannot edit accounts without login
    it("rejects account updates without login", async () => {
        const user = await createStudent(studentA);

        const response = await request(app)
            .put(`/api/users/${user.id}`)
            .send({
                username: "Unauthorized User"
            });

        expect(response.status).toBe(401);
    });

    // Test 16: Hide private account information
    it("hides private account fields", async () => {
        const user = await createStudent(studentA);

        const response = await request(app)
            .get(`/api/users/${user.id}`);

        expect(response.status).toBe(200);
        expect(response.body.username).toBe(studentA.name);
        expect(response.body.email).toBeUndefined();
        expect(response.body.password).toBeUndefined();
        expect(response.body.password_hash).toBeUndefined();
    });

    // Test 17: Cannot edit or delete comments without login
    it("rejects comment edits and deletes without login", async () => {
        const data = await createTestComment();

        const edit = await request(app)
            .put(`/api/comments/${data.commentId}`)
            .send({
                content: "Unauthorized change"
            });

        const remove = await request(app)
            .delete(`/api/comments/${data.commentId}`);

        expect(edit.status).toBe(401);
        expect(remove.status).toBe(401);
    });

    // Test 18: Cannot edit or delete listings without login
    it("rejects listing edits and deletes without login", async () => {
        const data = await createTestComment();

        const edit = await request(app)
            .put(`/api/listings/${data.listingId}`)
            .send({
                title: "Unauthorized change"
            });

        const remove = await request(app)
            .delete(`/api/listings/${data.listingId}`);

        expect(edit.status).toBe(401);
        expect(remove.status).toBe(401);
    });

    // Test 19: Cannot impersonate another comment author
    it("ignores a forged comment author ID", async () => {
        const data = await createTestComment();
        const other = await createStudent(studentB);

        const response = await other.agent
            .post("/api/comments")
            .send({
                content: "Test forged author",
                listing_id: data.listingId,
                user_id: data.owner.id
            });

        expect(response.status).toBe(201);
        expect(response.body.user_id).toBe(other.id);
    });
});
