/**
 * Provisioning State Client
 *
 * Read-only access to provisioning state from the web app.
 * For state transitions, use the worker service or credentials API.
 */

import { db } from "./db";

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
  const config = await db.systemConfig.findUnique({
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

/**
 * Set provisioning state to HEALTHY.
 * Used by credentials update API after successful validation.
 */
export async function setHealthy(adminId?: string): Promise<void> {
  const healthyAt = new Date().toISOString();

  const newState: ProvisioningState = {
    state: "HEALTHY",
    healthyAt,
    lastCheckedAt: healthyAt,
  };

  await db.$transaction(async (tx) => {
    await tx.systemConfig.upsert({
      where: { key: PROVISIONING_STATE_KEY },
      update: { value: newState as object },
      create: { key: PROVISIONING_STATE_KEY, value: newState as object },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "provisioning.state_healthy",
        details: {
          newState: "HEALTHY",
          trigger: "credentials_update",
        },
      },
    });
  });
}

/**
 * Set provisioning state to DEGRADED.
 * Used when detecting credential failures.
 */
export async function setDegraded(reason: string): Promise<void> {
  const currentState = await getProvisioningState();

  // Don't transition if already degraded
  if (currentState.state === "DEGRADED") {
    return;
  }

  const degradedAt = new Date().toISOString();
  const incidentId = `INC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

  const newState: ProvisioningState = {
    state: "DEGRADED",
    reason,
    degradedAt,
    healthyAt: currentState.healthyAt,
    lastCheckedAt: degradedAt,
    incidentId,
  };

  await db.$transaction(async (tx) => {
    await tx.systemConfig.upsert({
      where: { key: PROVISIONING_STATE_KEY },
      update: { value: newState as object },
      create: { key: PROVISIONING_STATE_KEY, value: newState as object },
    });

    await tx.auditLog.create({
      data: {
        action: "provisioning.state_degraded",
        details: {
          previousState: currentState.state,
          newState: "DEGRADED",
          reason,
          incidentId,
        },
      },
    });
  });
}
