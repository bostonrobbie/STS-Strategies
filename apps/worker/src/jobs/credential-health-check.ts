/**
 * Credential Health Check Job
 *
 * Monitors provisioning provider health and automatically:
 * 1. Switches to fallback mode when primary provider fails
 * 2. Recovers to primary mode when it becomes healthy again
 * 3. Sends admin alerts on status changes
 *
 * SCHEDULE: Every 15 minutes (via BullMQ repeatable job)
 * RECOVERY CHECK: Every 5 minutes when in fallback mode
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
// TYPES
// ============================================

export interface HealthStatus {
  provider: string;
  healthy: boolean;
  checkedAt: Date;
  error?: string;
}

export interface ProvisioningModeConfig {
  mode: "primary" | "fallback";
  activeProvider: ProviderMode;
  reason?: string;
  switchedAt?: Date;
  recoveredAt?: Date;
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

  const status: HealthStatus = {
    provider: provider.name,
    healthy: result.success,
    checkedAt: new Date(),
    error: result.error,
  };

  // Store health status in SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: "provisioning_health" },
    update: { value: status as any },
    create: { key: "provisioning_health", value: status as any },
  });

  console.log(
    `[HealthCheck] Provider ${provider.name}: ${status.healthy ? "HEALTHY" : "UNHEALTHY"}`
  );

  return status;
}

/**
 * Switch to fallback mode when primary provider fails
 */
export async function switchToFallbackMode(reason: string): Promise<void> {
  const currentConfig = await getCurrentModeConfig();

  // Don't switch if already in fallback
  if (currentConfig?.mode === "fallback") {
    console.log("[HealthCheck] Already in fallback mode");
    return;
  }

  const modeConfig: ProvisioningModeConfig = {
    mode: "fallback",
    activeProvider: "manual",
    reason,
    switchedAt: new Date(),
  };

  await prisma.systemConfig.upsert({
    where: { key: "provisioning_mode_config" },
    update: { value: modeConfig as any },
    create: { key: "provisioning_mode_config", value: modeConfig as any },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "provisioning.switched_to_fallback",
      details: {
        reason,
        previousMode: currentConfig?.activeProvider || "primary",
        newMode: "manual",
      },
    },
  });

  console.log(`[HealthCheck] Switched to fallback mode. Reason: ${reason}`);
}

/**
 * Recover to primary mode when provider becomes healthy
 */
export async function recoverToPrimaryMode(): Promise<void> {
  const primaryMode = getProvisioningMode();

  const modeConfig: ProvisioningModeConfig = {
    mode: "primary",
    activeProvider: primaryMode,
    recoveredAt: new Date(),
  };

  await prisma.systemConfig.upsert({
    where: { key: "provisioning_mode_config" },
    update: { value: modeConfig as any },
    create: { key: "provisioning_mode_config", value: modeConfig as any },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: "provisioning.recovered_to_primary",
      details: {
        activeProvider: primaryMode,
      },
    },
  });

  console.log(`[HealthCheck] Recovered to primary mode: ${primaryMode}`);
}

/**
 * Get current mode configuration from database
 */
export async function getCurrentModeConfig(): Promise<ProvisioningModeConfig | null> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "provisioning_mode_config" },
  });

  return config?.value as ProvisioningModeConfig | null;
}

/**
 * Check if system is in fallback mode
 */
export async function isInFallbackMode(): Promise<boolean> {
  const config = await getCurrentModeConfig();
  return config?.mode === "fallback";
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
 * Runs every 15 minutes to check primary provider health.
 * If primary fails, switches to fallback and alerts admin.
 */
export async function processHealthCheckJob(job: Job): Promise<void> {
  console.log(`[HealthCheck] Running health check job ${job.id}`);

  try {
    // Run health check
    const status = await runHealthCheck();

    if (!status.healthy) {
      // Provider is unhealthy
      const wasInFallback = await isInFallbackMode();

      if (!wasInFallback) {
        // First failure - switch to fallback and alert
        await switchToFallbackMode(status.error || "Health check failed");

        await sendProviderStatusAlert(
          "URGENT: Provisioning Provider Degraded",
          `Primary provider (${status.provider}) failed health check. System has switched to manual fallback mode.`,
          {
            provider: status.provider,
            error: status.error,
            checkedAt: status.checkedAt,
            urgency: "HIGH",
          }
        );
      }
    } else {
      // Provider is healthy
      const wasInFallback = await isInFallbackMode();

      if (wasInFallback) {
        // Recovery! Switch back to primary
        await recoverToPrimaryMode();

        await sendProviderStatusAlert(
          "Provisioning Provider Recovered",
          `Primary provider (${status.provider}) is healthy again. System has resumed normal operations.`,
          {
            provider: status.provider,
            checkedAt: status.checkedAt,
          }
        );

        // Process any queued jobs that were waiting
        await processQueuedProvisioningJobs();
      }
    }
  } catch (error) {
    console.error("[HealthCheck] Job failed:", error);
    throw error;
  }
}

/**
 * Process recovery check job (more frequent when in fallback mode)
 *
 * Runs every 5 minutes when in fallback mode to detect recovery faster.
 */
export async function processRecoveryCheckJob(job: Job): Promise<void> {
  console.log(`[HealthCheck] Running recovery check job ${job.id}`);

  const inFallback = await isInFallbackMode();
  if (!inFallback) {
    console.log("[HealthCheck] Not in fallback mode, skipping recovery check");
    return;
  }

  // Run health check
  const status = await runHealthCheck();

  if (status.healthy) {
    // Recovery!
    await recoverToPrimaryMode();

    await sendProviderStatusAlert(
      "Provisioning Provider Recovered",
      `Primary provider (${status.provider}) is healthy again. System has resumed normal operations.`,
      {
        provider: status.provider,
        checkedAt: status.checkedAt,
      }
    );

    await processQueuedProvisioningJobs();
  }
}

/**
 * Process queued provisioning jobs after recovery
 */
async function processQueuedProvisioningJobs(): Promise<void> {
  console.log("[HealthCheck] Processing queued provisioning jobs...");

  // Find all PENDING strategy access records that might need reprocessing
  const pendingAccess = await prisma.strategyAccess.findMany({
    where: {
      status: "PENDING",
      retryCount: { lt: 5 }, // Don't retry exhausted jobs
    },
    include: {
      user: { select: { tradingViewUsername: true } },
      strategy: { select: { pineId: true } },
    },
    take: 50, // Limit batch size
  });

  if (pendingAccess.length > 0) {
    console.log(
      `[HealthCheck] Found ${pendingAccess.length} pending jobs to reprocess`
    );
    // These will be picked up by the provisioning worker on its next poll
  }
}

// ============================================
// QUEUE SETUP
// ============================================

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || "";

/**
 * Create health check queue and start worker
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

  // Schedule repeatable jobs
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

  queue.add(
    "recovery-check",
    {},
    {
      repeat: {
        every: 5 * 60 * 1000, // 5 minutes
      },
      jobId: "recovery-check-5min",
    }
  );

  // Create worker
  const worker = new Worker(
    "health-check",
    async (job) => {
      if (job.name === "health-check") {
        await processHealthCheckJob(job);
      } else if (job.name === "recovery-check") {
        await processRecoveryCheckJob(job);
      }
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

  console.log("[HealthCheck] Queue and worker initialized");

  return { queue, worker };
}
