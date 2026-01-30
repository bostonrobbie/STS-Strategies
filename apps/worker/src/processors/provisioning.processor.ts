// Provisioning Processor
// Handles TradingView access provisioning jobs

import { Job } from "bullmq";
import { PrismaClient, AccessStatus } from "@prisma/client";
import { tradingViewService } from "../services/tradingview.service.js";
import { emailService } from "../services/email.service.js";

const prisma = new PrismaClient();

export interface ProvisioningJobData {
  strategyAccessId: string;
  userId: string;
  strategyId: string;
  attempt?: number;
}

export interface ProvisioningResult {
  success: boolean;
  message: string;
}

export async function processProvisioningJob(
  job: Job<ProvisioningJobData>
): Promise<ProvisioningResult> {
  const { strategyAccessId, userId, strategyId } = job.data;
  const attempt = (job.data.attempt || 0) + 1;

  console.log(`[Provisioning] Processing job ${job.id} (attempt ${attempt})`);

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
        message: "Awaiting manual provisioning",
      };
    }

    // Check if TradingView API is configured
    if (!tradingViewService.isConfigured()) {
      console.warn("[Provisioning] TradingView API not configured");
      // Leave as PENDING for manual processing
      await emailService.sendAdminAlert({
        subject: "Manual Provisioning Required",
        message: `TradingView API not configured. Manual provisioning required.`,
        details: {
          strategyAccessId,
          userId: user.id,
          userEmail: user.email,
          tradingViewUsername: user.tradingViewUsername,
          strategyName: strategy.name,
          pineId: strategy.pineId,
        },
      });
      return {
        success: true,
        message: "Awaiting manual provisioning (API not configured)",
      };
    }

    // Validate the TradingView username
    console.log(`[Provisioning] Validating TV username: ${user.tradingViewUsername}`);
    const validateResult = await tradingViewService.validateUsername(
      user.tradingViewUsername
    );

    if (!validateResult.success) {
      const errorMsg = `Invalid TradingView username: ${validateResult.error}`;
      await updateAccessFailed(strategyAccessId, errorMsg, attempt);
      await notifyAccessFailed(user, strategy, errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Grant access
    console.log(`[Provisioning] Granting access to ${strategy.pineId}`);
    const grantResult = await tradingViewService.grantAccess({
      username: user.tradingViewUsername,
      pineId: strategy.pineId,
      duration: "1L", // Lifetime
    });

    if (!grantResult.success) {
      const errorMsg = `Failed to grant access: ${grantResult.error}`;
      await updateAccessFailed(strategyAccessId, errorMsg, attempt);
      await notifyAccessFailed(user, strategy, errorMsg);
      return {
        success: false,
        message: errorMsg,
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
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Provisioning] Error processing job ${job.id}:`, error);

    // Update the access record with failure
    await updateAccessFailed(strategyAccessId, errorMsg, attempt).catch(console.error);

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
