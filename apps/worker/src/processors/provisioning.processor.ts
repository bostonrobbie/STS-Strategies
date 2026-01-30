// Provisioning Processor
// Handles TradingView access provisioning jobs using the provider framework
//
// DEGRADED State Behavior:
// - When system is DEGRADED, jobs are deferred (thrown back to queue)
// - Auth errors (401/403) trigger transition to DEGRADED
// - Jobs stay PENDING during incidents (not marked FAILED permanently)

import { Job } from "bullmq";
import { PrismaClient, AccessStatus } from "@prisma/client";
import { executeWithFallback, checkProvisioningHealth } from "../providers/index.js";
import { emailService } from "../services/email.service.js";
import {
  getProvisioningState,
  transitionToDegraded,
  isAuthErrorResult,
} from "../services/provisioning-state.js";

const prisma = new PrismaClient();

// Custom error for DEGRADED state - allows BullMQ to handle retry differently
export class DegradedStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DegradedStateError";
  }
}

// Custom error for auth failures - triggers DEGRADED transition
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export interface ProvisioningJobData {
  strategyAccessId: string;
  userId: string;
  strategyId: string;
  attempt?: number;
}

export interface ProvisioningResult {
  success: boolean;
  message: string;
  usedFallback?: boolean;
  requiresManualAction?: boolean;
}

export async function processProvisioningJob(
  job: Job<ProvisioningJobData>
): Promise<ProvisioningResult> {
  const { strategyAccessId, userId, strategyId } = job.data;
  const attempt = (job.data.attempt || 0) + 1;

  console.log(`[Provisioning] Processing job ${job.id} (attempt ${attempt})`);

  // ===========================================
  // DEGRADED STATE CHECK
  // If system is DEGRADED, defer processing by throwing
  // This keeps jobs in queue until credentials are restored
  // ===========================================
  const provisioningState = await getProvisioningState();
  if (provisioningState.state === "DEGRADED") {
    console.log(
      `[Provisioning] System is DEGRADED - deferring job ${job.id} (reason: ${provisioningState.reason})`
    );
    // Throw a specific error that BullMQ will use to retry later
    // Use a longer delay for degraded state retries
    throw new DegradedStateError(
      `System is in DEGRADED state: ${provisioningState.reason}`
    );
  }

  // Log health status on first attempt
  if (attempt === 1) {
    const health = await checkProvisioningHealth();
    console.log(`[Provisioning] System health: ${health.status} (mode: ${health.mode})`);
  }

  try {
    // Get the strategy access record with related data
    const strategyAccess = await prisma.strategyAccess.findUnique({
      where: { id: strategyAccessId },
      include: {
        user: true,
        strategy: true,
      },
    });

    if (!strategyAccess) {
      throw new Error(`StrategyAccess not found: ${strategyAccessId}`);
    }

    // Skip if already granted
    if (strategyAccess.status === AccessStatus.GRANTED) {
      console.log(`[Provisioning] Access already granted for ${strategyAccessId}`);
      return {
        success: true,
        message: "Access already granted",
      };
    }

    const { user, strategy } = strategyAccess;

    // Validate TradingView username exists
    if (!user.tradingViewUsername) {
      const errorMsg = "User has not set TradingView username";
      await updateAccessFailed(strategyAccessId, errorMsg, attempt);
      await notifyAccessFailed(user, strategy, errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Check if auto-provisioning is enabled for this strategy
    if (!strategy.autoProvision) {
      console.log(`[Provisioning] Auto-provision disabled for strategy ${strategy.slug}`);
      // Leave as PENDING for manual processing
      return {
        success: true,
        message: "Awaiting manual provisioning (auto-provision disabled)",
        requiresManualAction: true,
      };
    }

    // Execute provisioning with the primary provider
    // NOTE: Manual fallback is disabled - auth errors trigger DEGRADED state instead
    const result = await executeWithFallback(
      async (provider) => {
        // First validate the username
        console.log(`[Provisioning] Validating TV username with ${provider.name}: ${user.tradingViewUsername}`);
        const validateResult = await provider.validateUsername(user.tradingViewUsername!);

        // Check for auth error in validation
        if (isAuthErrorResult(validateResult)) {
          console.error(`[Provisioning] Auth error during validation: ${validateResult.message}`);
          // This will be handled below
          return {
            success: false,
            message: `AUTH_ERROR: ${validateResult.message}`,
            metadata: { authError: true },
            requiresManualAction: false,
          };
        }

        // Only fail on validation for non-manual providers
        if (!validateResult.success && provider.name !== "manual") {
          return {
            success: false,
            message: `Invalid TradingView username: ${validateResult.error}`,
            requiresManualAction: false,
          };
        }

        // Grant access
        console.log(`[Provisioning] Granting access with ${provider.name} to ${strategy.pineId}`);
        const grantResult = await provider.grantAccess({
          username: user.tradingViewUsername!,
          pineId: strategy.pineId,
          duration: "1L", // Lifetime
          strategyName: strategy.name,
          userEmail: user.email,
          userId: user.id,
          strategyAccessId: strategyAccessId,
        });

        return grantResult;
      },
      {
        // Disable automatic fallback to manual provider
        allowManualFallback: false,
        onFallback: (primaryError, fallbackProvider) => {
          console.log(`[Provisioning] Falling back to ${fallbackProvider.name}: ${primaryError}`);
        },
      }
    );

    // ===========================================
    // AUTH ERROR DETECTION
    // If result indicates auth error, transition to DEGRADED
    // and keep the job in queue (throw to retry later)
    // ===========================================
    if (isAuthErrorResult(result)) {
      const authErrorMsg = result.message || "TradingView authentication failed";
      console.error(`[Provisioning] Auth error detected: ${authErrorMsg}`);

      // Transition system to DEGRADED state
      await transitionToDegraded(authErrorMsg, {
        metadata: {
          triggeringJob: job.id,
          strategyAccessId,
          userId,
          strategyId,
        },
      });

      // Don't mark as FAILED - keep as PENDING for retry after recovery
      await prisma.strategyAccess.update({
        where: { id: strategyAccessId },
        data: {
          failureReason: `System degraded: ${authErrorMsg}`,
          retryCount: attempt,
          lastAttemptAt: new Date(),
          // Status stays PENDING, not FAILED
        },
      });

      // Throw to requeue - will be deferred until system is HEALTHY
      throw new AuthError(authErrorMsg);
    }

    if (!result.success && !result.requiresManualAction) {
      const errorMsg = `Failed to grant access: ${result.message}`;
      await updateAccessFailed(strategyAccessId, errorMsg, attempt);
      await notifyAccessFailed(user, strategy, errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Handle manual provisioning case
    if (result.requiresManualAction) {
      // Update to PENDING with note about manual action
      await prisma.strategyAccess.update({
        where: { id: strategyAccessId },
        data: {
          status: AccessStatus.PENDING,
          failureReason: "Awaiting manual provisioning",
          retryCount: attempt,
          lastAttemptAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "access.pending_manual",
          details: {
            strategyAccessId,
            strategyId: strategy.id,
            strategyName: strategy.name,
            pineId: strategy.pineId,
            tradingViewUsername: user.tradingViewUsername,
            attempt,
            usedFallback: result.usedFallback,
          },
        },
      });

      console.log(`[Provisioning] Manual provisioning required for ${strategyAccessId}`);

      return {
        success: true,
        message: result.message,
        requiresManualAction: true,
        usedFallback: result.usedFallback,
      };
    }

    // Success! Update the access record
    await prisma.strategyAccess.update({
      where: { id: strategyAccessId },
      data: {
        status: AccessStatus.GRANTED,
        grantedAt: new Date(),
        failureReason: null,
        retryCount: attempt,
        lastAttemptAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "access.granted",
        details: {
          strategyAccessId,
          strategyId: strategy.id,
          strategyName: strategy.name,
          pineId: strategy.pineId,
          tradingViewUsername: user.tradingViewUsername,
          attempt,
          usedFallback: result.usedFallback,
        },
      },
    });

    // Send success email
    await emailService.sendAccessGranted({
      to: user.email,
      userName: user.name || "Trader",
      strategyName: strategy.name,
      tradingViewUsername: user.tradingViewUsername,
    });

    console.log(`[Provisioning] Successfully granted access for ${strategyAccessId}`);

    return {
      success: true,
      message: "Access granted successfully",
      usedFallback: result.usedFallback,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Provisioning] Error processing job ${job.id}:`, error);

    // Handle DEGRADED state errors - just re-throw for retry
    if (error instanceof DegradedStateError) {
      // Don't update access record - it stays PENDING
      console.log(`[Provisioning] Job ${job.id} deferred due to DEGRADED state`);
      throw error; // Re-throw to trigger retry with backoff
    }

    // Handle auth errors - don't mark as FAILED
    if (error instanceof AuthError) {
      // Access record already updated above, just re-throw for retry
      console.log(`[Provisioning] Job ${job.id} deferred due to auth error`);
      throw error; // Re-throw to trigger retry
    }

    // For other errors, mark as FAILED after max retries
    // But keep as PENDING for retry-able errors before max attempts
    const maxAttempts = 5; // Match BullMQ config
    if (attempt >= maxAttempts) {
      await updateAccessFailed(strategyAccessId, errorMsg, attempt).catch(console.error);
    } else {
      // Keep as PENDING with failure reason for non-final attempts
      await prisma.strategyAccess.update({
        where: { id: strategyAccessId },
        data: {
          failureReason: errorMsg,
          retryCount: attempt,
          lastAttemptAt: new Date(),
          // Status stays PENDING until final attempt
        },
      }).catch(console.error);
    }

    throw error; // Re-throw to trigger retry
  }
}

async function updateAccessFailed(
  strategyAccessId: string,
  reason: string,
  attempt: number
): Promise<void> {
  await prisma.strategyAccess.update({
    where: { id: strategyAccessId },
    data: {
      status: AccessStatus.FAILED,
      failureReason: reason,
      retryCount: attempt,
      lastAttemptAt: new Date(),
    },
  });

  // Get related data for audit log
  const access = await prisma.strategyAccess.findUnique({
    where: { id: strategyAccessId },
    include: { user: true, strategy: true },
  });

  if (access) {
    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        action: "access.failed",
        details: {
          strategyAccessId,
          strategyId: access.strategyId,
          strategyName: access.strategy.name,
          reason,
          attempt,
        },
      },
    });

    // Check for repeated failures - alert admin on 3rd+ failure
    if (attempt >= 3) {
      await emailService.sendAdminAlert({
        subject: `URGENT: Repeated Provisioning Failure (Attempt ${attempt})`,
        message: `Access provisioning has failed ${attempt} times for a user. Manual intervention may be required.`,
        details: {
          strategyAccessId,
          userId: access.userId,
          userEmail: access.user.email,
          tradingViewUsername: access.user.tradingViewUsername || "Not set",
          strategyName: access.strategy.name,
          pineId: access.strategy.pineId,
          failureReason: reason,
          attemptCount: attempt,
          urgency: attempt >= 5 ? "CRITICAL" : "HIGH",
        },
      });
    }
  }
}

async function notifyAccessFailed(
  user: { id: string; email: string; name: string | null },
  strategy: { id: string; name: string; pineId: string },
  reason: string
): Promise<void> {
  // Notify user
  await emailService.sendAccessFailed({
    to: user.email,
    userName: user.name || "Trader",
    strategyName: strategy.name,
    reason,
  });

  // Notify admin
  await emailService.sendAdminAlert({
    subject: "Access Provisioning Failed",
    message: `Failed to provision access for user.`,
    details: {
      userId: user.id,
      userEmail: user.email,
      strategyName: strategy.name,
      pineId: strategy.pineId,
      reason,
    },
  });
}
