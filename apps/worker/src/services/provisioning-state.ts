/**
 * Provisioning State Manager
 *
 * Centralized management of the provisioning system state.
 * Handles transitions between HEALTHY and DEGRADED states,
 * with audit logging and admin alerting.
 *
 * State is stored in SystemConfig with key: "provisioning_state"
 */

import { prisma } from "../lib/prisma.js";
import { emailService } from "./email.service.js";
import { config } from "../lib/config.js";

// ============================================
// TYPES
// ============================================

export type ProvisioningStateValue = "HEALTHY" | "DEGRADED";

export interface ProvisioningState {
  state: ProvisioningStateValue;
  reason?: string;
  degradedAt?: string; // ISO timestamp when entered DEGRADED
  healthyAt?: string; // ISO timestamp when last became healthy
  lastCheckedAt?: string; // ISO timestamp of last health check
  incidentId?: string; // UUID for tracking/correlation
}

const PROVISIONING_STATE_KEY = "provisioning_state";

// ============================================
// STATE RETRIEVAL
// ============================================

/**
 * Get the current provisioning state from SystemConfig.
 * Returns HEALTHY by default if no state is stored.
 */
export async function getProvisioningState(): Promise<ProvisioningState> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: PROVISIONING_STATE_KEY },
  });

  if (!config) {
    return {
      state: "HEALTHY",
      healthyAt: new Date().toISOString(),
    };
  }

  return config.value as unknown as ProvisioningState;
}

/**
 * Quick check if system is in HEALTHY state.
 */
export async function isHealthy(): Promise<boolean> {
  const state = await getProvisioningState();
  return state.state === "HEALTHY";
}

/**
 * Quick check if system is in DEGRADED state.
 */
export async function isDegraded(): Promise<boolean> {
  const state = await getProvisioningState();
  return state.state === "DEGRADED";
}

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Transition the provisioning system to DEGRADED state.
 * This will:
 * 1. Update SystemConfig with DEGRADED state and reason
 * 2. Create an audit log entry
 * 3. Send an admin alert email
 *
 * @param reason - Human-readable reason for degradation
 * @param options - Additional options for the transition
 */
export async function transitionToDegraded(
  reason: string,
  options?: {
    skipAlert?: boolean;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const currentState = await getProvisioningState();

  // Don't transition if already degraded (prevent alert spam)
  if (currentState.state === "DEGRADED") {
    console.log(
      "[ProvisioningState] Already in DEGRADED state, updating reason only"
    );
    await updateState({
      ...currentState,
      reason,
      lastCheckedAt: new Date().toISOString(),
    });
    return;
  }

  const incidentId = generateIncidentId();
  const degradedAt = new Date().toISOString();

  const newState: ProvisioningState = {
    state: "DEGRADED",
    reason,
    degradedAt,
    healthyAt: currentState.healthyAt,
    lastCheckedAt: degradedAt,
    incidentId,
  };

  await prisma.$transaction(async (tx) => {
    // Update state
    await tx.systemConfig.upsert({
      where: { key: PROVISIONING_STATE_KEY },
      update: { value: newState as object },
      create: { key: PROVISIONING_STATE_KEY, value: newState as object },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: "provisioning.state_degraded",
        details: {
          previousState: currentState.state,
          newState: "DEGRADED",
          reason,
          incidentId,
          ...options?.metadata,
        },
      },
    });
  });

  console.log(`[ProvisioningState] Transitioned to DEGRADED: ${reason}`);

  // Send admin alert (outside transaction)
  if (!options?.skipAlert) {
    await sendDegradedAlert(reason, incidentId);
  }
}

/**
 * Transition the provisioning system to HEALTHY state.
 * This will:
 * 1. Update SystemConfig with HEALTHY state
 * 2. Create an audit log entry
 * 3. Return the number of pending jobs that can now be processed
 *
 * @param adminId - The admin user ID who triggered the recovery
 * @param credentialId - The credential ID that was used for recovery
 */
export async function transitionToHealthy(
  adminId?: string,
  credentialId?: string
): Promise<{ previousState: ProvisioningState }> {
  const currentState = await getProvisioningState();

  const healthyAt = new Date().toISOString();

  const newState: ProvisioningState = {
    state: "HEALTHY",
    healthyAt,
    lastCheckedAt: healthyAt,
    // Clear incident data
    reason: undefined,
    degradedAt: undefined,
    incidentId: undefined,
  };

  await prisma.$transaction(async (tx) => {
    // Update state
    await tx.systemConfig.upsert({
      where: { key: PROVISIONING_STATE_KEY },
      update: { value: newState as object },
      create: { key: PROVISIONING_STATE_KEY, value: newState as object },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "provisioning.state_healthy",
        details: {
          previousState: currentState.state,
          newState: "HEALTHY",
          wasIncident: currentState.state === "DEGRADED",
          incidentId: currentState.incidentId,
          incidentDuration: currentState.degradedAt
            ? calculateDuration(currentState.degradedAt, healthyAt)
            : undefined,
          credentialId,
        },
      },
    });
  });

  console.log("[ProvisioningState] Transitioned to HEALTHY");

  return { previousState: currentState };
}

/**
 * Update the provisioning state without triggering transition logic.
 * Used for updating lastCheckedAt or other metadata.
 */
export async function updateState(
  state: ProvisioningState
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: PROVISIONING_STATE_KEY },
    update: { value: state as object },
    create: { key: PROVISIONING_STATE_KEY, value: state as object },
  });
}

/**
 * Update the lastCheckedAt timestamp.
 */
export async function updateLastChecked(): Promise<void> {
  const currentState = await getProvisioningState();
  await updateState({
    ...currentState,
    lastCheckedAt: new Date().toISOString(),
  });
}

// ============================================
// ALERTING
// ============================================

/**
 * Send an admin alert for DEGRADED state.
 */
async function sendDegradedAlert(
  reason: string,
  incidentId: string
): Promise<void> {
  // Get count of pending jobs
  const pendingCount = await prisma.strategyAccess.count({
    where: { status: "PENDING" },
  });

  await emailService.sendAdminAlert({
    subject: "URGENT: Provisioning System DEGRADED",
    message: `The TradingView provisioning system has entered DEGRADED mode.

New checkouts are being BLOCKED until credentials are updated.

Reason: ${reason}

Pending Jobs: ${pendingCount} job(s) waiting to be processed

Incident ID: ${incidentId}

ACTION REQUIRED:
1. Go to ${config.appUrl}/admin/credentials
2. Update TradingView session cookies
3. Validate and save new credentials
4. Pending jobs will automatically resume`,
    details: {
      reason,
      incidentId,
      pendingJobs: pendingCount,
      timestamp: new Date().toISOString(),
      actionUrl: `${config.appUrl}/admin/credentials`,
      urgency: "CRITICAL",
    },
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Generate a unique incident ID for tracking.
 */
function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INC-${timestamp}-${random}`.toUpperCase();
}

/**
 * Calculate duration between two ISO timestamps.
 */
function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ============================================
// AUTH ERROR DETECTION
// ============================================

/**
 * Check if an error indicates an authentication/credential issue.
 * These errors should trigger DEGRADED state.
 */
export function isAuthError(error: Error | string | unknown): boolean {
  const message =
    typeof error === "string"
      ? error.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

  return (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("session expired") ||
    message.includes("invalid credentials") ||
    message.includes("auth_error") ||
    message.includes("authentication failed") ||
    message.includes("invalid session") ||
    message.includes("session invalid")
  );
}

/**
 * Check if a provisioning result indicates an auth error.
 */
export function isAuthErrorResult(result: {
  success: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
}): boolean {
  if (result.success) return false;

  // Check metadata for explicit auth error flag
  if (result.metadata?.authError === true) return true;

  // Check message for auth-related keywords
  if (result.message && isAuthError(result.message)) return true;

  // Check for HTTP status codes indicating auth failure
  const httpStatus = result.metadata?.httpStatus;
  if (httpStatus === 401 || httpStatus === 403) return true;

  return false;
}
