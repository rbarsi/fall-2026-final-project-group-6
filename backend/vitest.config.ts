import { defineConfig } from "vitest/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL before running backend tests.");
}

if (!new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("The test database name must end with _test.");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: "local-and-ci-test-secret-only",
    },
  },
});