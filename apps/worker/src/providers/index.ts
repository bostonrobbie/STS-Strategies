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
 * 1. Playwright (no cookie rotation needed)
 * 2. Unofficial API (requires cookie rotation)
 * 3. Manual (fallback)
 */
export function getProvisioningMode(): ProviderMode {
  const mode = process.env.PROVISIONING_MODE as ProviderMode | undefined;

  // If explicitly set, use that mode
  if (mode) {
    return mode;
  }

  // Auto-detect: prefer Playwright (no cookie rotation), then unofficial-api, then manual
  const playwrightProvider = providers["playwright"];
  if (playwrightProvider.isConfigured()) {
    return "playwright";
  }

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
 * Execute provisioning with automatic fallback
 */
export async function executeWithFallback<T>(
  operation: (provider: ProvisioningProvider) => Promise<T & { success: boolean }>,
  onFallback?: (primaryError: string, fallbackProvider: ProvisioningProvider) => void
): Promise<T & { success: boolean; usedFallback?: boolean }> {
  const primaryMode = getProvisioningMode();
  const primaryProvider = providers[primaryMode];

  // Try primary provider if configured
  if (primaryProvider.isConfigured()) {
    try {
      const result = await operation(primaryProvider);
      if (result.success) {
        return { ...result, usedFallback: false };
      }
      // Primary failed, try fallback
      console.log(`[Provisioning] Primary provider "${primaryMode}" failed, trying fallback`);
    } catch (error) {
      console.error(`[Provisioning] Primary provider error:`, error);
    }
  }

  // Use fallback
  const fallbackMode = getFallbackMode();
  if (fallbackMode === primaryMode) {
    // No different fallback available
    return operation(primaryProvider) as Promise<T & { success: boolean; usedFallback?: boolean }>;
  }

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
