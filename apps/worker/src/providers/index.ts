// Provisioning Provider Factory
// Manages provider selection and fallback logic

import { config } from "../lib/config.js";
import type { ProvisioningProvider, ProviderMode, ProvisioningResult } from "./types.js";
import { UnofficialApiProvider } from "./unofficial-api.provider.js";
import { ManualProvider } from "./manual.provider.js";
import { PlaywrightProvider } from "./playwright.provider.js";

export * from "./types.js";
export * from "./manual.provider.js";
export * from "./unofficial-api.provider.js";
export * from "./playwright.provider.js";

// Provider instances
const providers: Record<ProviderMode, ProvisioningProvider> = {
  "unofficial-api": new UnofficialApiProvider(),
  playwright: new PlaywrightProvider(),
  manual: new ManualProvider(),
};

/**
 * Get the current provisioning mode from environment
 *
 * Priority order (if no explicit mode set):
 * 1. Unofficial API (session cookie based)
 * 2. Manual (fallback)
 *
 * NOTE: Playwright provider is DISABLED due to 2FA on bot account.
 * If PROVISIONING_MODE=playwright is set, we fall back to unofficial-api.
 */
export function getProvisioningMode(): ProviderMode {
  const mode = process.env.PROVISIONING_MODE as ProviderMode | undefined;

  // Handle deprecated playwright mode
  if (mode === "playwright") {
    console.warn(
      "[Provisioning] Playwright mode is DISABLED due to 2FA on bot account. " +
        "Falling back to unofficial-api. " +
        "Please update PROVISIONING_MODE environment variable."
    );
    // Fall through to auto-detect
  } else if (mode && mode !== "playwright") {
    // If explicitly set to something other than playwright, use it
    return mode;
  }

  // Auto-detect: only unofficial-api or manual (Playwright is disabled)
  const apiProvider = providers["unofficial-api"];
  if (apiProvider.isConfigured()) {
    return "unofficial-api";
  }

  return "manual";
}

/**
 * Get the fallback provisioning mode
 */
export function getFallbackMode(): ProviderMode {
  const fallback = process.env.PROVISIONING_FALLBACK_MODE as ProviderMode | undefined;
  return fallback || "manual";
}

/**
 * Get a specific provider by mode
 */
export function getProvider(mode: ProviderMode): ProvisioningProvider {
  return providers[mode];
}

/**
 * Get the current active provider (based on configuration)
 */
export function getActiveProvider(): ProvisioningProvider {
  const mode = getProvisioningMode();
  const provider = providers[mode];

  // If primary provider isn't configured, fall back
  if (!provider.isConfigured()) {
    const fallbackMode = getFallbackMode();
    console.log(`[Provisioning] Primary provider "${mode}" not configured, using fallback "${fallbackMode}"`);
    return providers[fallbackMode];
  }

  return provider;
}

/**
 * Options for executeWithFallback
 */
export interface ExecuteWithFallbackOptions {
  /**
   * Whether to allow fallback to manual provider.
   * Default: false
   *
   * When false and primary provider fails, the operation will throw
   * rather than falling back to manual. This ensures auth errors
   * trigger DEGRADED state instead of creating manual tasks.
   */
  allowManualFallback?: boolean;

  /**
   * Callback when falling back to another provider
   */
  onFallback?: (primaryError: string, fallbackProvider: ProvisioningProvider) => void;
}

/**
 * Execute provisioning with the primary provider.
 *
 * IMPORTANT: Manual fallback is DISABLED by default.
 * - Auth errors should trigger DEGRADED state, not manual tasks
 * - Manual tasks are only for explicit admin actions
 * - Set allowManualFallback: true only for explicit admin retry operations
 */
export async function executeWithFallback<T>(
  operation: (provider: ProvisioningProvider) => Promise<T & { success: boolean }>,
  options?: ExecuteWithFallbackOptions
): Promise<T & { success: boolean; usedFallback?: boolean }> {
  const { allowManualFallback = false, onFallback } = options || {};

  const primaryMode = getProvisioningMode();
  const primaryProvider = providers[primaryMode];

  // Try primary provider if configured
  if (primaryProvider.isConfigured()) {
    try {
      const result = await operation(primaryProvider);
      if (result.success) {
        return { ...result, usedFallback: false };
      }
      // Primary failed
      console.log(
        `[Provisioning] Primary provider "${primaryMode}" failed: ${(result as { message?: string }).message || "unknown error"}`
      );
    } catch (error) {
      console.error(`[Provisioning] Primary provider error:`, error);
    }
  }

  // Determine fallback
  const fallbackMode = getFallbackMode();

  // If fallback is manual and manual fallback is disabled, throw
  // This ensures auth errors trigger DEGRADED state
  if (fallbackMode === "manual" && !allowManualFallback) {
    console.log(
      `[Provisioning] Manual fallback is DISABLED. Primary provider "${primaryMode}" failed without fallback.`
    );
    // Return failure result instead of falling back to manual
    return {
      success: false,
      message: `Primary provider "${primaryMode}" failed and manual fallback is disabled`,
      usedFallback: false,
    } as T & { success: boolean; usedFallback?: boolean };
  }

  // If fallback is same as primary, no point in retrying
  if (fallbackMode === primaryMode) {
    return {
      success: false,
      message: `Primary provider "${primaryMode}" failed and no fallback available`,
      usedFallback: false,
    } as T & { success: boolean; usedFallback?: boolean };
  }

  // Use fallback (only if it's not manual, or manual is explicitly allowed)
  const fallbackProvider = providers[fallbackMode];
  onFallback?.(
    `Primary provider "${primaryMode}" unavailable or failed`,
    fallbackProvider
  );

  const result = await operation(fallbackProvider);
  return { ...result, usedFallback: true };
}

/**
 * Check provisioning system health
 */
export async function checkProvisioningHealth(): Promise<{
  mode: ProviderMode;
  configured: boolean;
  fallbackMode: ProviderMode;
  fallbackConfigured: boolean;
  status: "healthy" | "degraded" | "manual-only";
}> {
  const mode = getProvisioningMode();
  const fallbackMode = getFallbackMode();
  const primaryConfigured = providers[mode].isConfigured();
  const fallbackConfigured = providers[fallbackMode].isConfigured();

  let status: "healthy" | "degraded" | "manual-only";
  if (mode !== "manual" && primaryConfigured) {
    status = "healthy";
  } else if (fallbackMode !== "manual" && fallbackConfigured) {
    status = "degraded";
  } else {
    status = "manual-only";
  }

  return {
    mode,
    configured: primaryConfigured,
    fallbackMode,
    fallbackConfigured,
    status,
  };
}
