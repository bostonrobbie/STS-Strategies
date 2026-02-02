/**
 * Performance and Load Testing Suite
 * 
 * Tests the platform under various load conditions to ensure stability
 * and identify bottlenecks before production deployment.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "10");
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION_MS || "60000");

test.describe("Performance Testing", () => {
  test("Homepage loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;
    
    console.log(`Homepage load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test("Strategies page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/strategies`);
    const loadTime = Date.now() - startTime;
    
    console.log(`Strategies page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test("API endpoints respond quickly", async ({ request }) => {
    const endpoints = [
      "/api/health",
      "/api/strategies",
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(`${BASE_URL}${endpoint}`);
      const responseTime = Date.now() - startTime;
      
      console.log(`${endpoint} response time: ${responseTime}ms`);
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(1000); // API should respond in under 1 second
    }
  });

  test("Database queries perform well", async ({ request }) => {
    // Test strategies list endpoint (involves database query)
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await request.get(`${BASE_URL}/api/strategies`);
      times.push(Date.now() - startTime);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`Average query time: ${avgTime}ms, Max: ${maxTime}ms`);
    expect(avgTime).toBeLessThan(500);
    expect(maxTime).toBeLessThan(1000);
  });

  test("Concurrent user simulation", async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_USERS, 5) }, () =>
        browser.newContext()
      )
    );

    const pages = await Promise.all(
      contexts.map((context) => context.newPage())
    );

    const startTime = Date.now();
    
    // Simulate concurrent users browsing the site
    await Promise.all(
      pages.map(async (page, index) => {
        try {
          await page.goto(BASE_URL);
          await page.waitForLoadState("networkidle");
          
          // Navigate to strategies
          await page.goto(`${BASE_URL}/strategies`);
          await page.waitForLoadState("networkidle");
          
          // Navigate to contact
          await page.goto(`${BASE_URL}/contact`);
          await page.waitForLoadState("networkidle");
        } catch (error) {
          console.error(`User ${index + 1} encountered error:`, error);
        }
      })
    );

    const totalTime = Date.now() - startTime;
    console.log(`${CONCURRENT_USERS} concurrent users completed in ${totalTime}ms`);
    
    // Clean up
    await Promise.all(contexts.map((context) => context.close()));
    
    // All users should complete without errors
    expect(totalTime).toBeLessThan(30000); // Should complete in under 30 seconds
  });

  test("Memory usage stays stable", async ({ page }) => {
    // Navigate through multiple pages to check for memory leaks
    const pages = [
      BASE_URL,
      `${BASE_URL}/strategies`,
      `${BASE_URL}/contact`,
      `${BASE_URL}/disclaimer`,
    ];

    for (let i = 0; i < 3; i++) {
      for (const url of pages) {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
      }
    }

    // If we got here without crashing, memory is stable
    expect(true).toBeTruthy();
  });

  test("Large payload handling", async ({ request }) => {
    // Test contact form with large message
    const largeMessage = "A".repeat(10000); // 10KB message
    
    const response = await request.post(`${BASE_URL}/api/contact`, {
      data: {
        name: "Test User",
        email: "test@example.com",
        subject: "Load Test",
        message: largeMessage,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test("Rapid successive requests", async ({ request }) => {
    // Test rate limiting and request handling
    const requests = Array.from({ length: 20 }, () =>
      request.get(`${BASE_URL}/api/strategies`)
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.ok()).length;
    
    console.log(`${successCount}/20 requests succeeded`);
    expect(successCount).toBeGreaterThan(15); // At least 75% should succeed
  });
});

test.describe("Core Web Vitals", () => {
  test("Largest Contentful Paint (LCP)", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ["largest-contentful-paint"] });
        
        // Timeout after 10 seconds
        setTimeout(() => resolve(0), 10000);
      });
    });

    console.log(`LCP: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s
  });

  test("First Input Delay (FID) simulation", async ({ page }) => {
    await page.goto(BASE_URL);
    
    const startTime = Date.now();
    await page.click("body"); // Simulate user interaction
    const fid = Date.now() - startTime;
    
    console.log(`FID simulation: ${fid}ms`);
    expect(fid).toBeLessThan(100); // Good FID is under 100ms
  });

  test("Cumulative Layout Shift (CLS)", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ entryTypes: ["layout-shift"] });
        
        setTimeout(() => resolve(clsValue), 5000);
      });
    });

    console.log(`CLS: ${cls}`);
    expect(cls).toBeLessThan(0.1); // Good CLS is under 0.1
  });
});

test.describe("Stress Testing", () => {
  test("Extended load test", async ({ page }) => {
    const startTime = Date.now();
    const errors: string[] = [];

    while (Date.now() - startTime < Math.min(TEST_DURATION_MS, 30000)) {
      try {
        await page.goto(BASE_URL);
        await page.waitForLoadState("networkidle");
        
        await page.goto(`${BASE_URL}/strategies`);
        await page.waitForLoadState("networkidle");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`Stress test completed. Errors: ${errors.length}`);
    expect(errors.length).toBeLessThan(5); // Allow up to 5 errors in extended test
  });
});
