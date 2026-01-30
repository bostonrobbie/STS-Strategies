/**
 * Credential Health Check Job
 *
 * Monitors provisioning provider health and credential status:
 * 1. Switches to MANUAL mode when credentials fail health check
 * 2. Tracks credential age and sends warnings at 7/14 day thresholds
 * 3. Does NOT auto-recover to AUTO mode - requires admin action
 *
 * SCHEDULE: Every 15 minutes (via BullMQ repeatable job)
 *
 * IMPORTANT: Auto-recovery is DISABLED. When credentials fail, the system
 * switches to MANUAL mode and stays there until an admin validates and
 * saves new credentials via the Admin > Credentials page.
 */

import { Queue, Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { emailService } from "../services/email.service.js";
import {
  getProvisioningMode,
  getProvider,
  checkProvisioningHealth,
  type ProviderMode,
} from "../providers/index.js";

// ============================================
// CONSTANTS
// ============================================

const CREDENTIAL_WARNING_AGE_HOURS = 7 * 24; // 7 days
const CREDENTIAL_ALERT_AGE_HOURS = 14 * 24; // 14 days
const SERVICE_MODE_KEY = "provisioning_service_mode";

// ============================================
// TYPES
// ============================================

export interface HealthStatus {
  provider: string;
  healthy: boolean;
  checkedAt: Date;
  error?: string;
  credentialAgeHours?: number;
}

export interface ServiceModeConfig {
  mode: "AUTO" | "MANUAL" | "DISABLED";
  reason?: string;
  changedAt?: string;
  changedBy?: string;
}

// ============================================
// CREDENTIAL AGE TRACKING
// ============================================

/**
 * Get credential age in hours from database
 */
async function getCredentialAgeHours(): Promise<number | null> {
  const credential = await prisma.tradingViewCredential.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!credential) {
    return null;
  }

  const ageMs = Date.now() - credential.createdAt.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60));
}

/**
 * Check if credential age warning should be sent
 */
async function checkCredentialAgeWarnings(): Promise<void> {
  const ageHours = await getCredentialAgeHours();

  if (ageHours === null) {
    return; // No credentials stored
  }

  const ageDays = Math.floor(ageHours / 24);

  // Check for 14-day alert (urgent)
  if (ageHours >= CREDENTIAL_ALERT_AGE_HOURS) {
    const lastAlertKey = "credential_age_alert_14d";
    const lastAlert = await prisma.systemConfig.findUnique({
      where: { key: lastAlertKey },
    });

    // Only send once per day
    const lastAlertDate = lastAlert?.value as { sentAt: string } | null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    if (!lastAlertDate || new Date(lastAlertDate.sentAt).getTime() < oneDayAgo) {
      await sendProviderStatusAlert(
        "URGENT: TradingView Credentials Need Refresh",
        `TradingView credentials are ${ageDays} days old and may expire soon. ` +
          "Please refresh credentials immediately to avoid service disruption.",
        {
          credentialAgeDays: ageDays,
          credentialAgeHours: ageHours,
          urgency: "CRITICAL",
          action: "Go to Admin > Credentials to update",
        }
      );

      await prisma.systemConfig.upsert({
        where: { key: lastAlertKey },
        update: { value: { sentAt: new Date().toISOString() } },
        create: { key: lastAlertKey, value: { sentAt: new Date().toISOString() } },
      });
    }
  }
  // Check for 7-day warning
  else if (ageHours >= CREDENTIAL_WARNING_AGE_HOURS) {
    const lastAlertKey = "credential_age_alert_7d";
    const lastAlert = await prisma.systemConfig.findUnique({
      where: { key: lastAlertKey },
    });

    // Only send once per day
    const lastAlertDate = lastAlert?.value as { sentAt: string } | null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    if (!lastAlertDate || new Date(lastAlertDate.sentAt).getTime() < oneDayAgo) {
      await sendProviderStatusAlert(
        "TradingView Credentials Aging - Consider Refresh",
        `TradingView credentials are ${ageDays} days old. ` +
          "Consider refreshing credentials soon to prevent potential service issues.",
        {
          credentialAgeDays: ageDays,
          credentialAgeHours: ageHours,
          urgency: "WARNING",
          action: "Go to Admin > Credentials when convenient",
        }
      );

      await prisma.systemConfig.upsert({
        where: { key: lastAlertKey },
        update: { value: { sentAt: new Date().toISOString() } },
        create: { key: lastAlertKey, value: { sentAt: new Date().toISOString() } },
      });
    }
  }
}

// ============================================
// HEALTH CHECK FUNCTIONS
// ============================================

/**
 * Run a health check against the primary provisioning provider
 */
export async function runHealthCheck(): Promise<HealthStatus> {
  const mode = getProvisioningMode();
  const provider = getProvider(mode);

  console.log(`[HealthCheck] Checking provider: ${provider.name}`);

  // Test with known-good username that should always exist
  const result = await provider.validateUsername("TradingView");

  const credentialAgeHours = await getCredentialAgeHours();

  const status: HealthStatus = {
    provider: provider.name,
    healthy: result.success,
    checkedAt: new Date(),
    error: result.error,
    credentialAgeHours: credentialAgeHours ?? undefined,
  };

  // Store health status in SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: "provisioning_health" },
    update: { value: status as any },
    create: { key: "provisioning_health", value: status as any },
  });

  // Update credential validatedAt if healthy
  if (result.success) {
    const activeCredential = await prisma.tradingViewCredential.findFirst({
      where: { isActive: true },
    });

    if (activeCredential) {
      await prisma.tradingViewCredential.update({
        where: { id: activeCredential.id },
        data: { validatedAt: new Date() },
      });
    }
  }

  console.log(
    `[HealthCheck] Provider ${provider.name}: ${status.healthy ? "HEALTHY" : "UNHEALTHY"}`
  );

  return status;
}

/**
 * Get current service mode from database
 */
export async function getCurrentServiceMode(): Promise<ServiceModeConfig | null> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: SERVICE_MODE_KEY },
  });

  return config?.value as ServiceModeConfig | null;
}

/**
 * Switch to MANUAL mode when credentials fail
 *
 * NOTE: Does NOT auto-switch back to AUTO. Admin must validate
 * and save new credentials via the Admin > Credentials page.
 */
export async function switchToManualMode(reason: string): Promise<void> {
  const currentConfig = await getCurrentServiceMode();

  // Don't switch if already in MANUAL
  if (currentConfig?.mode === "MANUAL") {
    console.log("[HealthCheck] Already in MANUAL mode");
    return;
  }

  const modeConfig: ServiceModeConfig = {
    mode: "MANUAL",
    reason,
    changedAt: new Date().toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.systemConfig.upsert({
      where: { key: SERVICE_MODE_KEY },
      update: { value: modeConfig as any },
      create: { key: SERVICE_MODE_KEY, value: modeConfig as any },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: "provisioning.switched_to_manual",
        details: {
          reason,
          previousMode: currentConfig?.mode || "AUTO",
          newMode: "MANUAL",
          autoRecoveryDisabled: true,
        },
      },
    });
  });

  console.log(`[HealthCheck] Switched to MANUAL mode. Reason: ${reason}`);
}

/**
 * Send admin alert about provider status change
 */
async function sendProviderStatusAlert(
  subject: string,
  message: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await emailService.sendAdminAlert({
      subject,
      message,
      details,
    });
    console.log(`[HealthCheck] Admin alert sent: ${subject}`);
  } catch (error) {
    console.error("[HealthCheck] Failed to send admin alert:", error);
  }
}

// ============================================
// MAIN HEALTH CHECK JOB
// ============================================

/**
 * Process health check job
 *
 * Runs every 15 minutes to:
 * 1. Check primary provider health
 * 2. Switch to MANUAL mode if unhealthy
 * 3. Check credential age and send warnings
 *
 * NOTE: Does NOT auto-recover to AUTO mode.
 */
export async function processHealthCheckJob(job: Job): Promise<void> {
  console.log(`[HealthCheck] Running health check job ${job.id}`);

  try {
    // Check credential age warnings first
    await checkCredentialAgeWarnings();

    // Get current service mode
    const currentMode = await getCurrentServiceMode();

    // If already in MANUAL mode, just log and return
    // Admin must manually recover via credentials page
    if (currentMode?.mode === "MANUAL") {
      console.log(
        "[HealthCheck] System in MANUAL mode. Auto-recovery disabled. " +
          "Admin must update credentials via Admin > Credentials page."
      );
      return;
    }

    // Run health check
    const status = await runHealthCheck();

    if (!status.healthy) {
      // Provider is unhealthy - switch to MANUAL mode
      await switchToManualMode(status.error || "Health check failed");

      await sendProviderStatusAlert(
        "URGENT: Provisioning Provider Failed - Manual Mode Active",
        `Primary provider (${status.provider}) failed health check. ` +
          "System has switched to MANUAL mode. " +
          "Automatic provisioning is DISABLED. " +
          "Admin must update credentials to restore AUTO mode.",
        {
          provider: status.provider,
          error: status.error,
          checkedAt: status.checkedAt,
          credentialAgeHours: status.credentialAgeHours,
          urgency: "CRITICAL",
          action: "Go to Admin > Credentials to update credentials and restore AUTO mode",
          autoRecoveryDisabled: true,
        }
      );
    }
  } catch (error) {
    console.error("[HealthCheck] Job failed:", error);
    throw error;
  }
}

// ============================================
// QUEUE SETUP
// ============================================

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || "";

/**
 * Create health check queue and start worker
 *
 * NOTE: Recovery check job is REMOVED. Auto-recovery is disabled.
 * Admin must manually recover via the credentials page.
 */
export function setupHealthCheckQueue(): {
  queue: Queue;
  worker: Worker;
} {
  // Create queue
  const queue = new Queue("health-check", {
    connection: {
      host: new URL(REDIS_URL).hostname,
      port: parseInt(new URL(REDIS_URL).port || "6379"),
      password: new URL(REDIS_URL).password,
      tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
    },
  });

  // Schedule health check every 15 minutes
  // NOTE: Recovery check removed - auto-recovery is disabled
  queue.add(
    "health-check",
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes
      },
      jobId: "health-check-15min",
    }
  );

  // Create worker
  const worker = new Worker(
    "health-check",
    async (job) => {
      if (job.name === "health-check") {
        await processHealthCheckJob(job);
      }
      // Recovery check job no longer supported
    },
    {
      connection: {
        host: new URL(REDIS_URL).hostname,
        port: parseInt(new URL(REDIS_URL).port || "6379"),
        password: new URL(REDIS_URL).password,
        tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[HealthCheck] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[HealthCheck] Job ${job?.id} failed:`, error);
  });

  console.log("[HealthCheck] Queue and worker initialized (auto-recovery DISABLED)");

  return { queue, worker };
}
