/**
 * Full Purchase Flow E2E Test
 *
 * Tests the complete journey: signup → onboarding → payment → access
 *
 * Uses mocked external dependencies:
 * - Stripe Checkout (intercepted)
 * - TradingView validation (mocked API)
 * - Provisioning provider (mocked)
 */

import { test, expect, Page } from "@playwright/test";

// Test helpers
async function mockTradingViewValidation(page: Page, valid: boolean = true) {
  await page.route("**/api/user/validate-username", async (route) => {
    if (valid) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          username: "testuser123",
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INVALID_USERNAME",
            message: "TradingView username not found",
          },
        }),
      });
    }
  });
}

async function mockStripeCheckout(page: Page, sessionId: string = "cs_test_123") {
  // Intercept checkout API call
  await page.route("**/api/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: `http://localhost:3000/dashboard?success=true&session_id=${sessionId}`,
      }),
    });
  });
}

async function mockStripeWebhook(page: Page, sessionId: string = "cs_test_123") {
  // Intercept webhook processing (this simulates webhook completion)
  await page.route("**/api/webhooks/stripe", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ received: true }),
    });
  });
}

test.describe("Full Purchase Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock TradingView validation as valid by default
    await mockTradingViewValidation(page, true);
    // Mock Stripe checkout
    await mockStripeCheckout(page);
  });

  test("shows pricing page with lifetime offer", async ({ page }) => {
    await page.goto("/pricing");

    // Should show lifetime pricing
    await expect(page.locator("text=Lifetime Access")).toBeVisible();
    await expect(page.locator("text=$497")).toBeVisible();

    // Should show all 6 strategies
    await expect(page.locator("text=MNQ Momentum")).toBeVisible();
    await expect(page.locator("text=ES Trend")).toBeVisible();
  });

  test("redirects to login when clicking purchase without auth", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Click purchase button
    await page.click('button:has-text("Purchase")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("onboarding validates TradingView username in real-time", async ({
    page,
  }) => {
    // Start at onboarding (simulating logged-in state)
    await page.goto("/onboarding");

    // Type a username
    await page.fill('input[name="tradingViewUsername"]', "testuser123");

    // Wait for validation indicator (mocked to succeed)
    await expect(
      page.locator('[data-testid="username-valid"], .text-green-600')
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be enabled
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("onboarding blocks invalid TradingView username", async ({ page }) => {
    // Override mock to return invalid
    await mockTradingViewValidation(page, false);

    await page.goto("/onboarding");

    // Type an invalid username
    await page.fill('input[name="tradingViewUsername"]', "invaliduser");

    // Wait for validation error
    await expect(
      page.locator('[data-testid="username-invalid"], .text-red-600')
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled or form should show error
    const submitButton = page.locator('button[type="submit"]');
    // Either button is disabled or clicking shows error
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    if (!isDisabled) {
      // Try submitting and expect error
      await submitButton.click();
      await expect(page.locator("text=not found")).toBeVisible();
    }
  });

  test("checkout blocked when validation service unavailable", async ({
    page,
  }) => {
    // Mock validation API to return 503
    await page.route("**/api/user/validate-username", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "TradingView validation is temporarily unavailable",
          },
        }),
      });
    });

    // Mock checkout to also return 503 (since re-validation fails)
    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "VALIDATION_SERVICE_UNAVAILABLE",
            message:
              "TradingView validation is temporarily unavailable. Please try again.",
          },
        }),
      });
    });

    await page.goto("/pricing");

    // Attempt checkout (simulating logged-in user)
    await page.click('button:has-text("Purchase")');

    // Should see service unavailable message
    await expect(
      page.locator("text=temporarily unavailable, text=try again")
    ).toBeVisible({ timeout: 5000 });
  });

  test("dashboard shows strategies after successful purchase", async ({
    page,
  }) => {
    // Simulate returning from successful checkout
    await page.goto("/dashboard?success=true&session_id=cs_test_123");

    // Should show success message
    await expect(
      page.locator("text=Thank you, text=Purchase successful, text=Success")
    ).toBeVisible({ timeout: 5000 });

    // Should show strategy cards
    await expect(page.locator('[data-testid="strategy-card"]')).toHaveCount(6, {
      timeout: 10000,
    });
  });

  test("dashboard shows pending access status initially", async ({ page }) => {
    // Mock API to return pending access
    await page.route("**/api/user/strategies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          strategies: [
            {
              id: "strategy_1",
              name: "MNQ Momentum",
              status: "PENDING",
              grantedAt: null,
            },
            {
              id: "strategy_2",
              name: "ES Trend",
              status: "PENDING",
              grantedAt: null,
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard");

    // Should show pending status
    await expect(page.locator("text=Pending")).toBeVisible();
  });

  test("dashboard shows active access status after provisioning", async ({
    page,
  }) => {
    // Mock API to return active access
    await page.route("**/api/user/strategies", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          strategies: [
            {
              id: "strategy_1",
              name: "MNQ Momentum",
              status: "GRANTED",
              grantedAt: new Date().toISOString(),
            },
            {
              id: "strategy_2",
              name: "ES Trend",
              status: "GRANTED",
              grantedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard");

    // Should show active status
    await expect(page.locator("text=Active, text=Granted")).toBeVisible();
  });
});

test.describe("Username Validation Edge Cases", () => {
  test("shows loading state during validation", async ({ page }) => {
    // Add delay to validation response
    await page.route("**/api/user/validate-username", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ valid: true, username: "testuser" }),
      });
    });

    await page.goto("/onboarding");
    await page.fill('input[name="tradingViewUsername"]', "testuser");

    // Should show loading indicator
    await expect(
      page.locator('[data-testid="username-validating"], .animate-spin')
    ).toBeVisible();
  });

  test("handles rate limiting gracefully", async ({ page }) => {
    await page.route("**/api/user/validate-username", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "Too many validation attempts. Please wait.",
          },
        }),
      });
    });

    await page.goto("/onboarding");
    await page.fill('input[name="tradingViewUsername"]', "testuser");

    // Should show rate limit message
    await expect(page.locator("text=Too many, text=wait")).toBeVisible({
      timeout: 5000,
    });
  });

  test("retry button appears on service error", async ({ page }) => {
    await page.route("**/api/user/validate-username", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable",
          },
        }),
      });
    });

    await page.goto("/onboarding");
    await page.fill('input[name="tradingViewUsername"]', "testuser");

    // Should show retry button
    await expect(
      page.locator('button:has-text("Retry"), button:has-text("Try Again")')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Admin New Strategy Auto-Grant", () => {
  test("admin can create new strategy", async ({ page }) => {
    // Mock admin auth
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "admin_1",
            email: "admin@example.com",
            role: "ADMIN",
          },
        }),
      });
    });

    // Mock strategies API
    await page.route("**/api/admin/strategies", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new_strategy_1",
            name: "New Strategy",
            pineId: "PUB;abc123",
            isActive: true,
            autoGrantQueued: true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ strategies: [] }),
        });
      }
    });

    await page.goto("/admin/strategies");

    // Click add new strategy
    await page.click('button:has-text("Add Strategy"), button:has-text("New")');

    // Fill form
    await page.fill('input[name="name"]', "New Strategy");
    await page.fill('input[name="pineId"]', "PUB;abc123");
    await page.check('input[name="isActive"]');

    // Submit
    await page.click('button[type="submit"]');

    // Should show success message mentioning auto-grant
    await expect(
      page.locator(
        "text=created, text=Auto-grant queued, text=Strategy created"
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("activating strategy triggers auto-grant", async ({ page }) => {
    // Mock admin auth
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin_1", email: "admin@example.com", role: "ADMIN" },
        }),
      });
    });

    // Mock strategy fetch
    await page.route("**/api/admin/strategies/strategy_1", async (route, request) => {
      if (request.method() === "PATCH") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "strategy_1",
            name: "Test Strategy",
            isActive: body.isActive,
            autoGrantQueued: body.isActive === true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "strategy_1",
            name: "Test Strategy",
            isActive: false,
          }),
        });
      }
    });

    await page.goto("/admin/strategies/strategy_1");

    // Toggle active
    await page.click('input[name="isActive"], [data-testid="toggle-active"]');

    // Save
    await page.click('button:has-text("Save")');

    // Should indicate auto-grant was queued
    await expect(
      page.locator("text=Auto-grant, text=queued, text=activated")
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Provisioning Health Dashboard", () => {
  test("shows healthy status in admin dashboard", async ({ page }) => {
    // Mock admin auth
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin_1", email: "admin@example.com", role: "ADMIN" },
        }),
      });
    });

    // Mock health status API
    await page.route("**/api/admin/provisioning/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "playwright",
          configured: true,
          fallbackMode: "manual",
          fallbackConfigured: true,
          status: "healthy",
          lastCheck: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/admin/provisioning");

    // Should show healthy indicator
    await expect(
      page.locator(
        '[data-testid="health-status-healthy"], .text-green-600, text=Healthy'
      )
    ).toBeVisible();
  });

  test("shows degraded status when in fallback mode", async ({ page }) => {
    // Mock admin auth
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "admin_1", email: "admin@example.com", role: "ADMIN" },
        }),
      });
    });

    // Mock health status as degraded
    await page.route("**/api/admin/provisioning/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "manual",
          configured: true,
          fallbackMode: "manual",
          fallbackConfigured: true,
          status: "degraded",
          reason: "Primary provider failed health check",
          lastCheck: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/admin/provisioning");

    // Should show degraded indicator
    await expect(
      page.locator(
        '[data-testid="health-status-degraded"], .text-yellow-600, text=Degraded, text=Fallback'
      )
    ).toBeVisible();
  });
});
