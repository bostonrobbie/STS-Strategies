/**
 * Health Check Endpoint
 *
 * Provides system health status including:
 * - Database connectivity
 * - Admin user existence (launch guard)
 * - Worker heartbeat status
 * - Provisioning system state
 *
 * This endpoint is PUBLIC - no authentication required.
 * Use for load balancer health checks and monitoring.
 */

import { NextResponse } from "next/server";
import { prisma } from "@sts/database";

// Worker is considered unhealthy if no heartbeat for 2 minutes
const WORKER_HEALTHY_THRESHOLD_MS = 120000;

export async function GET() {
  const checks: Record<string, { healthy: boolean; message?: string; value?: unknown }> = {};
  let overallHealthy = true;

  try {
    // 1. Database connectivity check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;
    checks.database = {
      healthy: true,
      message: "Connected",
      value: { latencyMs: dbLatencyMs },
    };
  } catch (error) {
    overallHealthy = false;
    checks.database = {
      healthy: false,
      message: error instanceof Error ? error.message : "Database unreachable",
    };
  }

  try {
    // 2. Admin user launch guard
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
      overallHealthy = false;
      checks.adminUser = {
        healthy: false,
        message: "LAUNCH GUARD: No admin user exists. Create admin before accepting traffic.",
        value: { adminCount: 0 },
      };
      console.error("[Health] LAUNCH GUARD: No admin user exists!");
    } else {
      checks.adminUser = {
        healthy: true,
        message: `${adminCount} admin user(s) configured`,
        value: { adminCount },
      };
    }
  } catch (error) {
    // Don't fail health check if admin count fails (DB check already covers this)
    checks.adminUser = {
      healthy: false,
      message: "Could not verify admin users",
    };
  }

  try {
    // 3. Worker heartbeat check
    const workerHeartbeat = await prisma.systemConfig.findUnique({
      where: { key: "worker_heartbeat" },
    });

    type HeartbeatValue = {
      lastSeen?: string;
      workerId?: string;
      uptime?: number;
    };

    const heartbeatValue = workerHeartbeat?.value as HeartbeatValue | null;

    if (!heartbeatValue?.lastSeen) {
      checks.worker = {
        healthy: false,
        message: "No worker heartbeat recorded. Worker may not be running.",
      };
      // Worker being down is a warning, not a failure for the web app health
    } else {
      const lastSeen = new Date(heartbeatValue.lastSeen);
      const ageMs = Date.now() - lastSeen.getTime();
      const isHealthy = ageMs < WORKER_HEALTHY_THRESHOLD_MS;

      if (!isHealthy) {
        checks.worker = {
          healthy: false,
          message: `Worker heartbeat stale (last seen ${Math.floor(ageMs / 1000)}s ago)`,
          value: {
            lastSeen: lastSeen.toISOString(),
            ageSeconds: Math.floor(ageMs / 1000),
            workerId: heartbeatValue.workerId,
          },
        };
      } else {
        checks.worker = {
          healthy: true,
          message: "Worker running",
          value: {
            lastSeen: lastSeen.toISOString(),
            ageSeconds: Math.floor(ageMs / 1000),
            workerId: heartbeatValue.workerId,
            uptime: heartbeatValue.uptime,
          },
        };
      }
    }
  } catch (error) {
    checks.worker = {
      healthy: false,
      message: "Could not check worker status",
    };
  }

  try {
    // 4. Provisioning state check
    const provisioningState = await prisma.systemConfig.findUnique({
      where: { key: "provisioning_state" },
    });

    type ProvisioningStateValue = {
      state?: string;
      reason?: string;
      incidentId?: string;
    };

    const stateValue = provisioningState?.value as ProvisioningStateValue | null;
    const state = stateValue?.state || "HEALTHY";

    if (state === "DEGRADED") {
      checks.provisioning = {
        healthy: false,
        message: `System in DEGRADED state: ${stateValue?.reason || "Unknown reason"}`,
        value: {
          state,
          incidentId: stateValue?.incidentId,
        },
      };
    } else {
      checks.provisioning = {
        healthy: true,
        message: "Provisioning system healthy",
        value: { state },
      };
    }
  } catch (error) {
    checks.provisioning = {
      healthy: false,
      message: "Could not check provisioning state",
    };
  }

  // Determine HTTP status
  // 200 = all critical checks pass (database, admin)
  // 503 = critical failure (no database, no admin)
  const criticalChecksPass = checks.database?.healthy && checks.adminUser?.healthy;
  const status = criticalChecksPass ? 200 : 503;

  return NextResponse.json(
    {
      status: overallHealthy && criticalChecksPass ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  );
}
