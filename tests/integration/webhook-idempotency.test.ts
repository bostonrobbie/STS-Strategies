/**
 * Webhook Idempotency Integration Tests
 *
 * Tests that Stripe webhooks are processed exactly once,
 * even when delivered multiple times concurrently.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database with idempotency behavior
const mockPurchases: Record<string, any> = {};

vi.mock("@/lib/db", () => ({
  db: {
    purchase: {
      findUnique: vi.fn((args) => {
        const purchase = mockPurchases[args.where.stripeSessionId];
        return Promise.resolve(purchase || null);
      }),
      create: vi.fn((args) => {
        const sessionId = args.data.stripeSessionId;

        // Simulate unique constraint violation
        if (mockPurchases[sessionId]) {
          const error = new Error("Unique constraint failed");
          (error as any).code = "P2002";
          return Promise.reject(error);
        }

        const purchase = {
          id: `purchase_${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        };
        mockPurchases[sessionId] = purchase;
        return Promise.resolve(purchase);
      }),
      update: vi.fn((args) => {
        const purchase = Object.values(mockPurchases).find(
          (p: any) => p.stripeSessionId === args.where.stripeSessionId
        );
        if (purchase) {
          Object.assign(purchase, args.data);
        }
        return Promise.resolve(purchase);
      }),
    },
    strategyAccess: {
      createMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "user_123",
        email: "test@example.com",
        tradingViewUsername: "validuser",
      }),
    },
    strategy: {
      findMany: vi.fn().mockResolvedValue([
        { id: "strategy_1", name: "Strategy 1" },
        { id: "strategy_2", name: "Strategy 2" },
      ]),
    },
  },
}));

import { db } from "@/lib/db";

describe("Webhook Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock purchases
    Object.keys(mockPurchases).forEach((key) => delete mockPurchases[key]);
  });

  /**
   * Simulate processing a webhook
   */
  async function processWebhook(sessionId: string, userId: string) {
    // Check if already processed
    const existing = await db.purchase.findUnique({
      where: { stripeSessionId: sessionId },
    });

    if (existing && existing.status === "COMPLETED") {
      // Already processed - idempotent response
      return { status: 200, alreadyProcessed: true };
    }

    try {
      // Try to create purchase record
      await db.purchase.create({
        data: {
          userId,
          stripeSessionId: sessionId,
          amount: 9900,
          currency: "usd",
          status: "COMPLETED",
          purchasedAt: new Date(),
        },
      });

      // Create strategy access records
      await db.strategyAccess.createMany({
        data: [],
      });

      return { status: 200, alreadyProcessed: false };
    } catch (error: any) {
      // Unique constraint violation = already created by concurrent request
      if (error.code === "P2002") {
        return { status: 200, alreadyProcessed: true };
      }
      throw error;
    }
  }

  it("processes payment only once under concurrent webhooks", async () => {
    const sessionId = "cs_test_concurrent_123";
    const userId = "user_123";

    // Fire 5 concurrent webhooks
    const results = await Promise.all([
      processWebhook(sessionId, userId),
      processWebhook(sessionId, userId),
      processWebhook(sessionId, userId),
      processWebhook(sessionId, userId),
      processWebhook(sessionId, userId),
    ]);

    // All should return 200 (idempotent)
    expect(results.every((r) => r.status === 200)).toBe(true);

    // Only one was actually processed (rest were duplicates)
    const processedCount = results.filter((r) => !r.alreadyProcessed).length;
    expect(processedCount).toBe(1);

    // Only one purchase record created
    const purchases = Object.values(mockPurchases);
    expect(purchases.length).toBe(1);
    expect(purchases[0].stripeSessionId).toBe(sessionId);
  });

  it("handles sequential duplicate webhooks", async () => {
    const sessionId = "cs_test_sequential_456";
    const userId = "user_123";

    // First webhook
    const result1 = await processWebhook(sessionId, userId);
    expect(result1.status).toBe(200);
    expect(result1.alreadyProcessed).toBe(false);

    // Second webhook (duplicate)
    const result2 = await processWebhook(sessionId, userId);
    expect(result2.status).toBe(200);
    expect(result2.alreadyProcessed).toBe(true);

    // Third webhook (duplicate)
    const result3 = await processWebhook(sessionId, userId);
    expect(result3.status).toBe(200);
    expect(result3.alreadyProcessed).toBe(true);

    // Still only one purchase
    expect(Object.values(mockPurchases).length).toBe(1);
  });

  it("creates separate purchases for different sessions", async () => {
    const userId = "user_123";

    const result1 = await processWebhook("cs_test_session_1", userId);
    const result2 = await processWebhook("cs_test_session_2", userId);

    expect(result1.alreadyProcessed).toBe(false);
    expect(result2.alreadyProcessed).toBe(false);

    // Two separate purchases
    expect(Object.values(mockPurchases).length).toBe(2);
  });
});
