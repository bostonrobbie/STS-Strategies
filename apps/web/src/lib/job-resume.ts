/**
 * Job Resume Service
 *
 * Handles resuming PENDING provisioning jobs when the system
 * recovers from DEGRADED state.
 *
 * This service is used by the credentials update API to automatically
 * re-queue jobs that were waiting during an incident.
 */

import { db } from "./db";
import { provisioningQueue } from "./queue";

export interface ResumeResult {
  requeued: number;
  failed: number;
  errors: string[];
}

/**
 * Get the count of PENDING StrategyAccess records.
 * These are jobs waiting to be processed.
 */
export async function getPendingJobsCount(): Promise<number> {
  return db.strategyAccess.count({
    where: { status: "PENDING" },
  });
}

/**
 * Resume all PENDING provisioning jobs.
 * This should be called after credentials are updated and validated.
 *
 * @param adminId - The admin user ID triggering the resume
 * @returns Result with counts and any errors
 */
export async function resumePendingJobs(adminId?: string): Promise<ResumeResult> {
  const result: ResumeResult = {
    requeued: 0,
    failed: 0,
    errors: [],
  };

  if (!provisioningQueue) {
    result.errors.push("Provisioning queue not available");
    return result;
  }

  // Find all PENDING StrategyAccess records
  const pendingAccess = await db.strategyAccess.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: {
          id: true,
          tradingViewUsername: true,
        },
      },
      strategy: {
        select: {
          id: true,
          name: true,
          pineId: true,
        },
      },
    },
  });

  if (pendingAccess.length === 0) {
    return result;
  }

  console.log(`[JobResume] Resuming ${pendingAccess.length} pending jobs`);

  // Re-queue each job
  for (const access of pendingAccess) {
    try {
      // Generate a new unique job ID for the resume
      const jobId = `resume-${access.id}-${Date.now()}`;

      // Add job to queue
      await provisioningQueue.add(
        "provision-access",
        {
          strategyAccessId: access.id,
          userId: access.userId,
          strategyId: access.strategyId,
          isResume: true, // Flag to indicate this is a resumed job
        },
        {
          jobId,
          // Use shorter backoff for resumed jobs
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000, // 5 seconds
          },
        }
      );

      // Update the StrategyAccess with the new job ID
      await db.strategyAccess.update({
        where: { id: access.id },
        data: {
          jobId,
          lastAttemptAt: new Date(),
        },
      });

      result.requeued++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Failed to resume job for access ${access.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error(`[JobResume] Failed to resume access ${access.id}:`, error);
    }
  }

  // Create audit log for the resume operation
  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "provisioning.jobs_resumed",
      details: {
        totalPending: pendingAccess.length,
        requeued: result.requeued,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    },
  });

  console.log(
    `[JobResume] Completed: ${result.requeued} requeued, ${result.failed} failed`
  );

  return result;
}

/**
 * Resume specific StrategyAccess records by IDs.
 *
 * @param accessIds - Array of StrategyAccess IDs to resume
 * @param adminId - The admin user ID triggering the resume
 */
export async function resumeSpecificJobs(
  accessIds: string[],
  adminId?: string
): Promise<ResumeResult> {
  const result: ResumeResult = {
    requeued: 0,
    failed: 0,
    errors: [],
  };

  if (!provisioningQueue) {
    result.errors.push("Provisioning queue not available");
    return result;
  }

  if (accessIds.length === 0) {
    return result;
  }

  // Fetch the access records
  const accessRecords = await db.strategyAccess.findMany({
    where: {
      id: { in: accessIds },
      status: "PENDING", // Only resume PENDING jobs
    },
    include: {
      user: {
        select: { id: true },
      },
      strategy: {
        select: { id: true },
      },
    },
  });

  for (const access of accessRecords) {
    try {
      const jobId = `resume-${access.id}-${Date.now()}`;

      await provisioningQueue.add(
        "provision-access",
        {
          strategyAccessId: access.id,
          userId: access.userId,
          strategyId: access.strategyId,
          isResume: true,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      await db.strategyAccess.update({
        where: { id: access.id },
        data: {
          jobId,
          lastAttemptAt: new Date(),
        },
      });

      result.requeued++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Failed to resume job for access ${access.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (result.requeued > 0 || result.failed > 0) {
    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "provisioning.jobs_resumed_specific",
        details: {
          requestedIds: accessIds,
          requeued: result.requeued,
          failed: result.failed,
        },
      },
    });
  }

  return result;
}
