/**
 * TradingView Access Service
 *
 * Single source of truth for all TradingView access management operations.
 * Provides clean API boundary for the worker to consume.
 *
 * Operations:
 * - validateUsername: Check if TradingView username exists
 * - grantAccess: Grant access to a Pine Script
 * - revokeAccess: Revoke access to a Pine Script
 * - healthCheck: Check credential and API health
 */

import {
  getActiveCredentials,
  getActiveCredentialMetadata,
  markCredentialsUsed,
  markCredentialsValidated,
  getServiceMode,
  setServiceMode,
  getCredentialAgeHours,
  hasCredentials,
} from "./credential-manager.js";
import type {
  TradingViewCredentials,
  ValidationResult,
  GrantAccessParams,
  RevokeAccessParams,
  AccessResult,
  HealthCheckResult,
  ServiceStatus,
  HealthRecommendation,
} from "./types.js";

// ============================================
// CONSTANTS
// ============================================

const REQUEST_TIMEOUT_MS = 15000; // 15 seconds
const CREDENTIAL_WARNING_AGE_HOURS = 7 * 24; // 7 days
const CREDENTIAL_ALERT_AGE_HOURS = 14 * 24; // 14 days

// ============================================
// HTTP HELPERS
// ============================================

function getHeaders(credentials: TradingViewCredentials): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Session-Id": credentials.sessionId,
    "X-Signature": credentials.signature,
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
}

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

/**
 * Validate a TradingView username exists.
 *
 * @param username - The TradingView username to validate
 * @returns Validation result with reason
 */
export async function validateUsername(
  username: string
): Promise<ValidationResult> {
  const credentials = await getActiveCredentials();

  if (!credentials) {
    return {
      valid: false,
      reason: "NOT_CONFIGURED",
      error: "TradingView API credentials not configured",
    };
  }

  // Check service mode
  const mode = await getServiceMode();
  if (mode === "DISABLED") {
    return {
      valid: false,
      reason: "NOT_CONFIGURED",
      error: "TradingView service is disabled",
    };
  }

  if (mode === "MANUAL") {
    return {
      valid: false,
      reason: "SERVICE_DOWN",
      error: "TradingView service is in manual mode",
    };
  }

  try {
    const url = `${credentials.apiUrl}/validate/${encodeURIComponent(username)}`;
    console.log(`[TVAccessService] Validating username: ${username}`);

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: getHeaders(credentials),
    });

    // Update last used timestamp
    const credentialMeta = await getActiveCredentialMetadata();
    if (credentialMeta) {
      await markCredentialsUsed(credentialMeta.id);
    }

    if (!response.ok) {
      if (response.status === 404) {
        return {
          valid: false,
          reason: "INVALID",
          error: "TradingView username does not exist",
        };
      }

      console.error(`[TVAccessService] Validation API error: ${response.status}`);
      return {
        valid: false,
        reason: "SERVICE_DOWN",
        error: `TradingView API returned error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.success === false || data.error) {
      return {
        valid: false,
        reason: "INVALID",
        error: data.error || "Username validation failed",
      };
    }

    return {
      valid: true,
      reason: "VALID",
      username: data.username || username,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Request timed out") {
      console.error(`[TVAccessService] Validation timeout for ${username}`);
      return {
        valid: false,
        reason: "TIMEOUT",
        error: "TradingView validation timed out",
      };
    }

    console.error("[TVAccessService] Validation error:", error);
    return {
      valid: false,
      reason: "SERVICE_DOWN",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Grant access to a Pine Script for a user.
 *
 * @param params - Grant parameters (scriptId, username, duration)
 * @returns Access result
 */
export async function grantAccess(params: GrantAccessParams): Promise<AccessResult> {
  const { scriptId, username, duration = "1L" } = params;

  const credentials = await getActiveCredentials();

  if (!credentials) {
    return {
      success: false,
      error: "TradingView API credentials not configured",
      requiresManualAction: true,
    };
  }

  // Check service mode
  const mode = await getServiceMode();
  if (mode !== "AUTO") {
    return {
      success: false,
      error: `Service is in ${mode} mode`,
      requiresManualAction: true,
    };
  }

  try {
    const url = `${credentials.apiUrl}/access/${encodeURIComponent(username)}`;
    console.log(`[TVAccessService] Granting access: ${username} -> ${scriptId}`);

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: getHeaders(credentials),
      body: JSON.stringify({
        pine_id: scriptId,
        duration,
      }),
    });

    // Update last used timestamp
    const credentialMeta = await getActiveCredentialMetadata();
    if (credentialMeta) {
      await markCredentialsUsed(credentialMeta.id);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TVAccessService] Grant failed: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Grant failed: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log(`[TVAccessService] Grant successful for ${username}`);

    return {
      success: true,
      message: data.message || "Access granted via API",
      metadata: { provider: "tradingview-access-service" },
    };
  } catch (error) {
    console.error("[TVAccessService] Grant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Revoke access to a Pine Script for a user.
 *
 * @param params - Revoke parameters (scriptId, username)
 * @returns Access result
 */
export async function revokeAccess(params: RevokeAccessParams): Promise<AccessResult> {
  const { scriptId, username } = params;

  const credentials = await getActiveCredentials();

  if (!credentials) {
    return {
      success: false,
      error: "TradingView API credentials not configured",
      requiresManualAction: true,
    };
  }

  // Check service mode
  const mode = await getServiceMode();
  if (mode !== "AUTO") {
    return {
      success: false,
      error: `Service is in ${mode} mode`,
      requiresManualAction: true,
    };
  }

  try {
    const url = `${credentials.apiUrl}/access/${encodeURIComponent(username)}`;
    console.log(`[TVAccessService] Revoking access: ${username} -> ${scriptId}`);

    const response = await fetchWithTimeout(url, {
      method: "DELETE",
      headers: getHeaders(credentials),
      body: JSON.stringify({
        pine_id: scriptId,
      }),
    });

    // Update last used timestamp
    const credentialMeta = await getActiveCredentialMetadata();
    if (credentialMeta) {
      await markCredentialsUsed(credentialMeta.id);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TVAccessService] Revoke failed: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Revoke failed: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log(`[TVAccessService] Revoke successful for ${username}`);

    return {
      success: true,
      message: data.message || "Access revoked via API",
      metadata: { provider: "tradingview-access-service" },
    };
  } catch (error) {
    console.error("[TVAccessService] Revoke error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check the health of the TradingView access service.
 *
 * @returns Health check result with recommendations
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const credentialMeta = await getActiveCredentialMetadata();
  const hasCreds = await hasCredentials();

  // No credentials configured
  if (!hasCreds) {
    return {
      credentialHealth: "NOT_CONFIGURED",
      apiHealth: "DOWN",
      lastValidation: null,
      credentialAgeHours: null,
      recommendation: "MANUAL_MODE",
      error: "No credentials configured",
    };
  }

  const credentialAgeHours = getCredentialAgeHours(credentialMeta);

  // Determine recommendation based on credential age
  let recommendation: HealthRecommendation = "NONE";
  if (credentialAgeHours !== null) {
    if (credentialAgeHours >= CREDENTIAL_ALERT_AGE_HOURS) {
      recommendation = "REFRESH_NOW";
    } else if (credentialAgeHours >= CREDENTIAL_WARNING_AGE_HOURS) {
      recommendation = "REFRESH_SOON";
    }
  }

  // Test the API by validating a known username
  const validationResult = await validateUsername("TradingView");

  if (
    validationResult.reason === "SERVICE_DOWN" ||
    validationResult.reason === "TIMEOUT"
  ) {
    return {
      credentialHealth: "EXPIRED",
      apiHealth: "DOWN",
      lastValidation: credentialMeta?.validatedAt || null,
      credentialAgeHours,
      recommendation: "MANUAL_MODE",
      error: validationResult.error,
    };
  }

  if (validationResult.reason === "NOT_CONFIGURED") {
    return {
      credentialHealth: "NOT_CONFIGURED",
      apiHealth: "DOWN",
      lastValidation: null,
      credentialAgeHours: null,
      recommendation: "MANUAL_MODE",
      error: validationResult.error,
    };
  }

  // Credentials are working - mark as validated
  if (credentialMeta) {
    await markCredentialsValidated(credentialMeta.id);
  }

  return {
    credentialHealth: "VALID",
    apiHealth: "HEALTHY",
    lastValidation: new Date(),
    credentialAgeHours,
    recommendation,
  };
}

/**
 * Get the current service status.
 *
 * @returns Service status summary
 */
export async function getStatus(): Promise<ServiceStatus> {
  const mode = await getServiceMode();
  const hasCreds = await hasCredentials();
  const credentialMeta = await getActiveCredentialMetadata();
  const credentialAgeHours = getCredentialAgeHours(credentialMeta);
  const credentials = await getActiveCredentials();

  return {
    mode,
    hasCredentials: hasCreds,
    credentialsValid: credentialMeta?.validatedAt !== null,
    lastValidatedAt: credentialMeta?.validatedAt || null,
    credentialAgeHours,
    apiConfigured: !!credentials?.apiUrl,
  };
}

/**
 * Validate credentials without storing them.
 * Used by admin UI to test credentials before saving.
 *
 * @param credentials - The credentials to test
 * @returns Whether credentials are valid
 */
export async function testCredentials(
  credentials: TradingViewCredentials
): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = `${credentials.apiUrl}/validate/TradingView`;

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: getHeaders(credentials),
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `API returned error: ${response.status}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Switch service mode and update credentials.
 * Called after admin validates and saves new credentials.
 *
 * @param mode - The new mode to set
 * @param reason - Reason for the change
 */
export async function switchServiceMode(
  mode: "AUTO" | "MANUAL" | "DISABLED",
  reason?: string
): Promise<void> {
  await setServiceMode(mode, reason);
  console.log(`[TVAccessService] Service mode switched to ${mode}: ${reason}`);
}
