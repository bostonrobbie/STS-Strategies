/**
 * Vitest Setup
 *
 * Runs before all tests to set up the test environment.
 */

import { beforeAll, afterAll, vi } from "vitest";

// Mock environment variables
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/sts_test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock Stripe
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_mock",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

// Global test setup
beforeAll(async () => {
  console.log("Starting test suite...");
});

// Global test teardown
afterAll(async () => {
  console.log("Test suite complete.");
});
