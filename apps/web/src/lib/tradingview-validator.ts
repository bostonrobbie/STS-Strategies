/**
 * TradingView Username Validator
 *
 * STRICT validation - NO graceful degradation.
 * If validation fails or is unavailable, checkout is BLOCKED.
 */

import { redis } from "./redis";
import { Ratelimit } from "@upstash/ratelimit";

// ============================================
// TYPES
// ============================================

export type ValidationReason =
  | "VALID"
  | "INVALID"
  | "SERVICE_DOWN"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED";

export interface ValidationResult {
  valid: boolean;
  reason: ValidationReason;
  username?: string;
  cachedAt?: string;
  error?: string;
}

interface CachedValidation {
  valid: boolean;
  reason: ValidationReason;
  username?: string;
  cachedAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const VALIDATION_TIMEOUT_MS = 10000; // 10 seconds - strict
const CACHE_TTL_VALID = 86400; // 24 hours for valid usernames
const CACHE_TTL_INVALID = 3600; // 1 hour for invalid (in case user fixes it)
const CACHE_KEY_PREFIX = "tv:validation:";

// ============================================
// RATE LIMITER
// ============================================

// Per-username rate limiter: 5 attempts per 60 seconds
export const tvValidationRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:tv-validation",
});

// Global rate limiter: 100 validations per 60 seconds (across all users)
export const tvValidationGlobalRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
  prefix: "ratelimit:tv-validation-global",
});

// ============================================
// VALIDATION FUNCTION
// ============================================

/**
 * Validate a TradingView username exists.
 *
 * STRICT BEHAVIOR:
 * - Returns SERVICE_DOWN or TIMEOUT if validation cannot complete
 * - These results should BLOCK checkout, not allow it
 * - Caches successful validations for 24h
 * - Caches invalid usernames for 1h
 */
export async function validateTradingViewUsername(
  username: string
): Promise<ValidationResult> {
  const normalizedUsername = username.toLowerCase().trim();

  // 1. Check configuration
  const apiUrl = process.env.TV_ACCESS_API_URL;
  const sessionId = process.env.TV_SESSION_ID;
  const signature = process.env.TV_SIGNATURE;

  if (!apiUrl || !sessionId || !signature) {
    console.error("[TV Validator] API not configured");
    return {
      valid: false,
      reason: "NOT_CONFIGURED",
      error: "TradingView validation service is not configured",
    };
  }

  // 2. Check Redis cache first
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedUsername}`;
    const cached = await redis.get<CachedValidation>(cacheKey);

    if (cached) {
      console.log(`[TV Validator] Cache hit for ${normalizedUsername}`);
      return {
        valid: cached.valid,
        reason: cached.reason,
        username: cached.username,
        cachedAt: cached.cachedAt,
      };
    }
  } catch (cacheError) {
    // Cache read failure should not block validation
    console.error("[TV Validator] Cache read error:", cacheError);
  }

  // 3. Check per-username rate limit
  const { success: withinUsernameLimit } =
    await tvValidationRateLimiter.limit(normalizedUsername);
  if (!withinUsernameLimit) {
    console.warn(`[TV Validator] Rate limited for username: ${normalizedUsername}`);
    return {
      valid: false,
      reason: "RATE_LIMITED",
      error: "Too many validation attempts. Please try again in a minute.",
    };
  }

  // 4. Check global rate limit
  const { success: withinGlobalLimit } =
    await tvValidationGlobalRateLimiter.limit("global");
  if (!withinGlobalLimit) {
    console.warn("[TV Validator] Global rate limit reached");
    return {
      valid: false,
      reason: "RATE_LIMITED",
      error: "Validation service is busy. Please try again in a moment.",
    };
  }

  // 5. Call TradingView API with STRICT timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

  try {
    console.log(`[TV Validator] Validating username: ${normalizedUsername}`);

    const response = await fetch(
      `${apiUrl}/validate/${encodeURIComponent(normalizedUsername)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
          "X-Signature": signature,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Check if it's a "user not found" vs "service error"
      if (response.status === 404) {
        const result: ValidationResult = {
          valid: false,
          reason: "INVALID",
          error: "TradingView username does not exist",
        };

        // Cache invalid result
        await cacheValidationResult(normalizedUsername, result);
        return result;
      }

      // Service error - strict blocking
      console.error(`[TV Validator] API error: ${response.status}`);
      return {
        valid: false,
        reason: "SERVICE_DOWN",
        error: `TradingView validation service returned error: ${response.status}`,
      };
    }

    const data = await response.json();

    // Check for success in response
    if (data.success === false || data.error) {
      const result: ValidationResult = {
        valid: false,
        reason: "INVALID",
        error: data.error || "Username validation failed",
      };

      await cacheValidationResult(normalizedUsername, result);
      return result;
    }

    // Success!
    const result: ValidationResult = {
      valid: true,
      reason: "VALID",
      username: data.username || username,
    };

    await cacheValidationResult(normalizedUsername, result);
    console.log(`[TV Validator] Username validated: ${normalizedUsername}`);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[TV Validator] Timeout for ${normalizedUsername}`);
      return {
        valid: false,
        reason: "TIMEOUT",
        error: "TradingView validation timed out. Please try again.",
      };
    }

    console.error("[TV Validator] Fetch error:", error);
    return {
      valid: false,
      reason: "SERVICE_DOWN",
      error: "Unable to reach TradingView validation service",
    };
  }
}

// ============================================
// CACHE HELPERS
// ============================================

async function cacheValidationResult(
  username: string,
  result: ValidationResult
): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${username}`;
    const ttl = result.valid ? CACHE_TTL_VALID : CACHE_TTL_INVALID;

    const cacheData: CachedValidation = {
      valid: result.valid,
      reason: result.reason,
      username: result.username,
      cachedAt: new Date().toISOString(),
    };

    await redis.setex(cacheKey, ttl, JSON.stringify(cacheData));
    console.log(`[TV Validator] Cached result for ${username} (TTL: ${ttl}s)`);
  } catch (error) {
    // Cache write failure should not affect validation result
    console.error("[TV Validator] Cache write error:", error);
  }
}

/**
 * Invalidate cached validation for a username.
 * Call this when a user updates their TradingView username.
 */
export async function invalidateValidationCache(
  username: string
): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${username.toLowerCase().trim()}`;
    await redis.del(cacheKey);
    console.log(`[TV Validator] Cache invalidated for ${username}`);
  } catch (error) {
    console.error("[TV Validator] Cache invalidation error:", error);
  }
}

/**
 * Check if validation service is healthy.
 * Used by health check jobs.
 */
export async function checkValidationServiceHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  // Use a known-good username that should always exist
  const result = await validateTradingViewUsername("TradingView");

  if (result.reason === "SERVICE_DOWN" || result.reason === "TIMEOUT") {
    return {
      healthy: false,
      error: result.error,
    };
  }

  if (result.reason === "NOT_CONFIGURED") {
    return {
      healthy: false,
      error: "TradingView API not configured",
    };
  }

  return { healthy: true };
}

/**
 * Check if a validation result should block checkout.
 * Returns true for blocking reasons (service issues).
 */
export function shouldBlockCheckout(result: ValidationResult): {
  block: boolean;
  statusCode: number;
  errorCode: string;
  message: string;
} {
  if (result.valid) {
    return {
      block: false,
      statusCode: 200,
      errorCode: "",
      message: "",
    };
  }

  switch (result.reason) {
    case "SERVICE_DOWN":
    case "TIMEOUT":
    case "NOT_CONFIGURED":
      return {
        block: true,
        statusCode: 503,
        errorCode: "VALIDATION_SERVICE_UNAVAILABLE",
        message:
          "TradingView validation is temporarily unavailable. Please try again in a few minutes.",
      };

    case "RATE_LIMITED":
      return {
        block: true,
        statusCode: 429,
        errorCode: "VALIDATION_RATE_LIMITED",
        message: "Too many validation attempts. Please try again in a moment.",
      };

    case "INVALID":
      return {
        block: true,
        statusCode: 400,
        errorCode: "USERNAME_INVALID",
        message:
          "Your TradingView username could not be verified. Please check and update it in settings.",
      };

    default:
      return {
        block: true,
        statusCode: 500,
        errorCode: "VALIDATION_FAILED",
        message: "Username validation failed. Please try again.",
      };
  }
}
