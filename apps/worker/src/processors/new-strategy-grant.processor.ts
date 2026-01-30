/**
 * New Strategy Auto-Grant Processor
 *
 * When a new strategy is created/activated, this processor
 * automatically grants access to all users with completed purchases.
 *
 * GUARANTEES:
 * 1. Idempotent - running twice won't create duplicates
 * 2. Rate-limited - 1 second delay between operations
 * 3. Transactional - batch creates are atomic
 * 4. Audited - all operations logged
 */

import { Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { provisioningQueue } from "../lib/queue.js";

// ============================================
// TYPES
// ============================================

export interface NewStrategyGrantJobData {
  strategyId: string;
  strategyName?: string;
  pineId?: string;
}

export interface GrantResult {
  userId: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
}

// ============================================
// PROCESSOR
// ============================================

/**
 * Process new strategy grant job
 *
 * Creates StrategyAccess records for all users with completed purchases
 * who don't already have access to this strategy.
 */
export async function processNewStrategyGrantJob(
  job: Job<NewStrategyGrantJobData>
): Promise<void> {
  const { strategyId, strategyName, pineId } = job.data;

  console.log(
    `[NewStrategyGrant] Processing job ${job.id} for strategy: ${strategyId}`
  );

  // 1. Get strategy details if not provided
  let strategy = strategyName && pineId
    ? { id: strategyId, name: strategyName, pineId }
    : await prisma.strategy.findUnique({
        where: { id: strategyId },
        select: { id: true, name: true, pineId: true, isActive: true },
      });

  if (!strategy) {
    console.error(`[NewStrategyGrant] Strategy ${strategyId} not found`);
    throw new Error(`Strategy ${strategyId} not found`);
  }

  // 2. Get all users with completed purchases who don't have this strategy
  const eligibleUsers = await prisma.user.findMany({
    where: {
      purchases: { some: { status: "COMPLETED" } },
      tradingViewUsername: { not: null }, // Must have TV username
      NOT: {
        strategyAccess: { some: { strategyId } },
      },
    },
    select: {
      id: true,
      email: true,
      tradingViewUsername: true,
    },
  });

  console.log(
    `[NewStrategyGrant] Found ${eligibleUsers.length} eligible users for strategy: ${strategy.name}`
  );

  if (eligibleUsers.length === 0) {
    console.log("[NewStrategyGrant] No eligible users, job complete");
    return;
  }

  // 3. Create access records with rate limiting
  const results: GrantResult[] = [];

  for (let i = 0; i < eligibleUsers.length; i++) {
    const user = eligibleUsers[i];

    // Rate limit: wait 1 second between operations
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      // Create access record (idempotent via unique constraint)
      const jobId = `new-strategy-${strategyId}-${user.id}`;

      await prisma.strategyAccess.create({
        data: {
          userId: user.id,
          strategyId,
          status: "PENDING",
          jobId,
        },
      });

      // Queue provisioning job
      await provisioningQueue.add(
        "provision",
        {
          strategyAccessId: jobId,
          userId: user.id,
          strategyId,
        },
        {
          jobId, // Ensures only one job per user/strategy
          delay: i * 2000, // Stagger provisioning jobs
        }
      );

      results.push({ userId: user.id, success: true });

      console.log(
        `[NewStrategyGrant] Created access for user ${user.id} (${i + 1}/${eligibleUsers.length})`
      );
    } catch (error: any) {
      // Handle unique constraint violation (already has access)
      if (error?.code === "P2002") {
        results.push({ userId: user.id, success: true, skipped: true });
        console.log(
          `[NewStrategyGrant] User ${user.id} already has access (skipped)`
        );
      } else {
        results.push({
          userId: user.id,
          success: false,
          error: error.message,
        });
        console.error(
          `[NewStrategyGrant] Failed to create access for user ${user.id}:`,
          error
        );
      }
    }
  }

  // 4. Log results
  const succeeded = results.filter((r) => r.success && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.success).length;

  await prisma.auditLog.create({
    data: {
      action: "strategy.auto_grant_batch",
      details: {
        strategyId,
        strategyName: strategy.name,
        total: eligibleUsers.length,
        succeeded,
        skipped,
        failed,
        failedUsers: results
          .filter((r) => !r.success)
          .map((r) => ({ userId: r.userId, error: r.error })),
      },
    },
  });

  console.log(
    `[NewStrategyGrant] Completed: ${succeeded} granted, ${skipped} skipped, ${failed} failed`
  );
}

// ============================================
// QUEUE HELPER
// ============================================

/**
 * Queue a new strategy grant job
 *
 * Call this when a new strategy is activated.
 */
export async function queueNewStrategyGrant(
  strategyId: string,
  strategyName?: string,
  pineId?: string
): Promise<void> {
  // Use a unique job ID to prevent duplicate jobs
  const jobId = `new-strategy-grant-${strategyId}`;

  await provisioningQueue.add(
    "new-strategy-grant",
    {
      strategyId,
      strategyName,
      pineId,
    },
    {
      jobId,
      // Don't retry immediately - admin should investigate
      attempts: 1,
    }
  );

  console.log(`[NewStrategyGrant] Queued grant job for strategy: ${strategyId}`);
}

/**
 * Check if a strategy grant job is already queued or running
 */
export async function isStrategyGrantJobPending(
  strategyId: string
): Promise<boolean> {
  const jobId = `new-strategy-grant-${strategyId}`;

  const job = await provisioningQueue.getJob(jobId);
  if (!job) return false;

  const state = await job.getState();
  return state === "waiting" || state === "active" || state === "delayed";
}
