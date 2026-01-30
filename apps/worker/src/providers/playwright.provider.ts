/**
 * Playwright Provisioning Provider
 *
 * @deprecated DO NOT USE - 2FA on bot account makes this provider unusable.
 * The TradingView bot account has 2FA enabled which prevents automated login.
 * This provider is kept for reference but always returns isConfigured: false.
 *
 * Use the unofficial-api provider with session cookies instead.
 * See: /admin/credentials for cookie management UI.
 *
 * ORIGINAL DESIGN (no longer applicable):
 * - Uses headless browser automation to manage TradingView access.
 * - Fresh login each time = no session expiration issues
 * - Works with 2FA (TOTP)
 *
 * REQUIREMENTS (if ever re-enabled):
 * - TV_BOT_EMAIL: TradingView account email
 * - TV_BOT_PASSWORD: TradingView account password
 * - TV_BOT_TOTP_SECRET: (Optional) TOTP secret for 2FA
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import type { ProvisioningProvider, ProvisioningResult } from "./types.js";

// TOTP generator for 2FA
function generateTOTP(secret: string): string {
  // Simple TOTP implementation using the secret
  // In production, use a proper TOTP library like 'otpauth'
  const { createHmac } = require("crypto");

  const time = Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  // Decode base32 secret
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, "")) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const secretBytes = Buffer.from(
    bits.match(/.{8}/g)?.map((b) => parseInt(b, 2)) || []
  );

  const hmac = createHmac("sha1", secretBytes);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

export class PlaywrightProvider implements ProvisioningProvider {
  name = "playwright-DISABLED";
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * Check if Playwright provider is configured
   *
   * @deprecated Always returns false - provider is disabled due to 2FA on bot account.
   */
  isConfigured(): boolean {
    // DISABLED: 2FA on bot account prevents automated login
    // This provider should never be used - return false regardless of env vars
    console.warn(
      "[PlaywrightProvider] This provider is DISABLED. " +
        "2FA on the TradingView bot account prevents automated login. " +
        "Use unofficial-api provider with session cookies instead."
    );
    return false;
  }

  /**
   * Get credentials from environment
   */
  private getCredentials() {
    return {
      email: process.env.TV_BOT_EMAIL || "",
      password: process.env.TV_BOT_PASSWORD || "",
      totpSecret: process.env.TV_BOT_TOTP_SECRET,
    };
  }

  /**
   * Get or create browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[Playwright] Launching browser...");
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      });
    }
    return this.browser;
  }

  /**
   * Get or create browser context with persistent cookies
   */
  private async getContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();

    if (!this.context) {
      this.context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
        locale: "en-US",
      });
    }

    return this.context;
  }

  /**
   * Create a new page in the browser context
   */
  private async getPage(): Promise<Page> {
    const context = await this.getContext();
    return context.newPage();
  }

  /**
   * Ensure logged into TradingView
   */
  private async ensureLoggedIn(page: Page): Promise<void> {
    const credentials = this.getCredentials();

    // Navigate to TradingView
    await page.goto("https://www.tradingview.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Check if already logged in by looking for user menu
    const userMenu = await page.$('[data-name="header-user-menu-button"]');
    if (userMenu) {
      console.log("[Playwright] Already logged in");
      return;
    }

    console.log("[Playwright] Logging in to TradingView...");

    // Click sign in button
    await page.click('button[data-name="header-user-menu-button"]');
    await page.waitForTimeout(500);

    // Look for sign in link/button
    const signInButton = await page.$('a[href*="signin"], button:has-text("Sign in")');
    if (signInButton) {
      await signInButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate directly to signin page if needed
    if (!page.url().includes("signin")) {
      await page.goto("https://www.tradingview.com/accounts/signin/", {
        waitUntil: "networkidle",
      });
    }

    // Wait for login form
    await page.waitForSelector('input[name="username"], input[type="email"]', {
      timeout: 10000,
    });

    // Fill in credentials
    const emailInput = await page.$('input[name="username"], input[type="email"]');
    if (emailInput) {
      await emailInput.fill(credentials.email);
    }

    await page.waitForTimeout(300);

    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill(credentials.password);
    }

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation or 2FA prompt
    await page.waitForTimeout(2000);

    // Check for 2FA prompt
    const totpInput = await page.$('input[name="code"], input[placeholder*="code"]');
    if (totpInput && credentials.totpSecret) {
      console.log("[Playwright] Handling 2FA...");
      const code = generateTOTP(credentials.totpSecret);
      await totpInput.fill(code);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Wait for successful login
    await page.waitForSelector('[data-name="header-user-menu-button"]', {
      timeout: 30000,
    });

    console.log("[Playwright] Login successful");
  }

  /**
   * Validate that a TradingView username exists
   */
  async validateUsername(username: string): Promise<{
    success: boolean;
    username?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Playwright provider not configured",
      };
    }

    let page: Page | null = null;

    try {
      page = await this.getPage();
      await this.ensureLoggedIn(page);

      // Navigate to user profile
      console.log(`[Playwright] Validating username: ${username}`);
      await page.goto(`https://www.tradingview.com/u/${encodeURIComponent(username)}/`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Check if user exists (look for profile content vs 404)
      const notFound = await page.$('text="Page not found"');
      const profileError = await page.$('text="User not found"');
      const profileContent = await page.$('[class*="profile"], [data-name="user-profile"]');

      if (notFound || profileError) {
        return {
          success: false,
          error: `User "${username}" not found on TradingView`,
        };
      }

      if (profileContent) {
        return {
          success: true,
          username: username,
        };
      }

      // If unclear, check the URL didn't redirect to error page
      if (page.url().includes("/u/" + username)) {
        return {
          success: true,
          username: username,
        };
      }

      return {
        success: false,
        error: "Unable to verify username existence",
      };
    } catch (error) {
      console.error("[Playwright] Validation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Grant access to a Pine Script for a user
   */
  async grantAccess(params: {
    username: string;
    pineId: string;
    duration: string;
  }): Promise<ProvisioningResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Playwright provider not configured",
      };
    }

    let page: Page | null = null;

    try {
      page = await this.getPage();
      await this.ensureLoggedIn(page);

      console.log(
        `[Playwright] Granting access: ${params.username} -> ${params.pineId}`
      );

      // Navigate to Pine Script page
      // TradingView Pine Scripts have URLs like: https://www.tradingview.com/script/XXXXX/
      // Or managed at: https://www.tradingview.com/pine/
      const pineId = params.pineId.replace("PUB;", "");
      await page.goto(
        `https://www.tradingview.com/pine/?id=${encodeURIComponent(params.pineId)}`,
        {
          waitUntil: "networkidle",
          timeout: 30000,
        }
      );

      // Look for "Manage Access" or similar button
      const manageAccessButton = await page.$(
        'button:has-text("Manage Access"), [data-name="manage-access"]'
      );

      if (!manageAccessButton) {
        // Try alternative: go to script page and find manage button
        await page.goto(`https://www.tradingview.com/script/${pineId}/`, {
          waitUntil: "networkidle",
        });

        // Look for manage access in dropdown or settings
        const settingsButton = await page.$('[aria-label="Settings"], button:has-text("...")');
        if (settingsButton) {
          await settingsButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Click manage access
      const manageButton = await page.$(
        'button:has-text("Manage Access"), [data-name="manage-access"], a:has-text("Manage Access")'
      );
      if (manageButton) {
        await manageButton.click();
        await page.waitForTimeout(1000);
      }

      // Wait for access management modal/panel
      await page.waitForSelector(
        '[data-name="add-user-input"], input[placeholder*="user"]',
        { timeout: 10000 }
      );

      // Fill in username
      const userInput = await page.$(
        '[data-name="add-user-input"], input[placeholder*="user"]'
      );
      if (userInput) {
        await userInput.fill(params.username);
        await page.waitForTimeout(500);
      }

      // Select lifetime duration
      const lifetimeOption = await page.$(
        '[data-name="duration-lifetime"], option[value="lifetime"], text="Lifetime"'
      );
      if (lifetimeOption) {
        await lifetimeOption.click();
      }

      // Click grant/add button
      const grantButton = await page.$(
        'button:has-text("Grant"), button:has-text("Add"), [data-name="grant-access-button"]'
      );
      if (grantButton) {
        await grantButton.click();
        await page.waitForTimeout(2000);
      }

      // Verify the user appears in the access list
      const accessList = await page.locator(`text="${params.username}"`).count();
      if (accessList > 0) {
        console.log(`[Playwright] Access granted to ${params.username}`);
        return {
          success: true,
          message: `Access granted to ${params.username} via Playwright`,
          metadata: {
            pineId: params.pineId,
            duration: params.duration,
          },
        };
      }

      return {
        success: false,
        message: "Could not verify access was granted",
        requiresManualAction: true,
      };
    } catch (error) {
      console.error("[Playwright] Grant access error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        requiresManualAction: true,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Revoke access to a Pine Script for a user
   */
  async revokeAccess(params: {
    username: string;
    pineId: string;
  }): Promise<ProvisioningResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Playwright provider not configured",
      };
    }

    let page: Page | null = null;

    try {
      page = await this.getPage();
      await this.ensureLoggedIn(page);

      console.log(
        `[Playwright] Revoking access: ${params.username} <- ${params.pineId}`
      );

      // Navigate to Pine Script management
      const pineId = params.pineId.replace("PUB;", "");
      await page.goto(
        `https://www.tradingview.com/pine/?id=${encodeURIComponent(params.pineId)}`,
        {
          waitUntil: "networkidle",
          timeout: 30000,
        }
      );

      // Find and click manage access
      const manageButton = await page.$(
        'button:has-text("Manage Access"), [data-name="manage-access"]'
      );
      if (manageButton) {
        await manageButton.click();
        await page.waitForTimeout(1000);
      }

      // Find user in access list and click remove/revoke
      const userRow = await page.locator(`text="${params.username}"`).first();
      if (await userRow.count()) {
        // Find the remove button in the same row
        const removeButton = await page.locator(
          `text="${params.username}" >> .. >> button:has-text("Remove"), text="${params.username}" >> .. >> button:has-text("Revoke")`
        ).first();

        if (await removeButton.count()) {
          await removeButton.click();
          await page.waitForTimeout(1000);

          // Confirm if there's a confirmation dialog
          const confirmButton = await page.$('button:has-text("Confirm"), button:has-text("Yes")');
          if (confirmButton) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      // Verify user is no longer in list
      const userStillExists = await page.locator(`text="${params.username}"`).count();
      if (userStillExists === 0) {
        console.log(`[Playwright] Access revoked for ${params.username}`);
        return {
          success: true,
          message: `Access revoked for ${params.username} via Playwright`,
        };
      }

      return {
        success: false,
        message: "Could not verify access was revoked",
        requiresManualAction: true,
      };
    } catch (error) {
      console.error("[Playwright] Revoke access error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        requiresManualAction: true,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Close browser and clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log("[Playwright] Browser cleanup complete");
  }
}

export const playwrightProvider = new PlaywrightProvider();
