import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { getProvisioningState, type ProvisioningState } from "@/lib/provisioning-state";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    // Get access record counts
    const [pending, failed, granted, revoked] = await Promise.all([
      prisma.strategyAccess.count({ where: { status: "PENDING" } }),
      prisma.strategyAccess.count({ where: { status: "FAILED" } }),
      prisma.strategyAccess.count({ where: { status: "GRANTED" } }),
      prisma.strategyAccess.count({ where: { status: "REVOKED" } }),
    ]);

    // Get pending and failed records with details
    const [pendingRecords, failedRecords] = await Promise.all([
      prisma.strategyAccess.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            select: { email: true, name: true, tradingViewUsername: true },
          },
          strategy: { select: { name: true, pineId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.strategyAccess.findMany({
        where: { status: "FAILED" },
        include: {
          user: {
            select: { email: true, name: true, tradingViewUsername: true },
          },
          strategy: { select: { name: true, pineId: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

    // Get manual tasks from SystemConfig
    const manualTaskConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: "manual_task:" },
      },
    });

    const manualTasks = manualTaskConfigs
      .map((c) => c.value as unknown as {
        id: string;
        type: "grant" | "revoke";
        username: string;
        pineId: string;
        strategyName?: string;
        userEmail?: string;
        createdAt: string;
        status: "pending" | "completed" | "failed";
      })
      .filter((t) => t.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Determine system health
    const tvApiConfigured = !!(
      process.env.TV_ACCESS_API_URL &&
      process.env.TV_SESSION_ID &&
      process.env.TV_SIGNATURE
    );

    const mode = process.env.PROVISIONING_MODE || (tvApiConfigured ? "unofficial-api" : "manual");
    const fallbackMode = process.env.PROVISIONING_FALLBACK_MODE || "manual";

    // Get provisioning state from database (new system)
    const provisioningState = await getProvisioningState();

    // Get worker heartbeat status
    const workerHeartbeat = await prisma.systemConfig.findUnique({
      where: { key: "worker_heartbeat" },
    });

    type WorkerHeartbeatValue = {
      lastSeen?: string;
      workerId?: string;
      uptime?: number;
      memoryUsageMB?: number;
    };

    const heartbeatValue = workerHeartbeat?.value as WorkerHeartbeatValue | null;
    const workerLastSeen = heartbeatValue?.lastSeen
      ? new Date(heartbeatValue.lastSeen)
      : null;
    const WORKER_HEALTHY_THRESHOLD_MS = 120000; // 2 minutes
    const workerHealthy = workerLastSeen
      ? (Date.now() - workerLastSeen.getTime()) < WORKER_HEALTHY_THRESHOLD_MS
      : false;

    // Determine status based on both env vars and provisioning_state
    // DEGRADED state takes precedence (auth/credential failure)
    let status: "healthy" | "degraded" | "manual-only";
    if (provisioningState.state === "DEGRADED") {
      status = "degraded";
    } else if (mode !== "manual" && tvApiConfigured) {
      status = "healthy";
    } else if (fallbackMode !== "manual") {
      status = "degraded";
    } else {
      status = "manual-only";
    }

    return NextResponse.json({
      stats: {
        pending,
        failed,
        granted,
        revoked,
        manualTasks: manualTasks.length,
      },
      health: {
        mode,
        configured: tvApiConfigured,
        fallbackMode,
        fallbackConfigured: fallbackMode === "manual" ? true : false,
        status,
        // New fields for DEGRADED state handling
        provisioningState: provisioningState.state,
        degradedAt: provisioningState.degradedAt,
        degradedReason: provisioningState.reason,
        healthyAt: provisioningState.healthyAt,
        incidentId: provisioningState.incidentId,
      },
      // Worker health monitoring
      worker: {
        healthy: workerHealthy,
        lastSeen: workerLastSeen?.toISOString() || null,
        workerId: heartbeatValue?.workerId || null,
        uptime: heartbeatValue?.uptime || null,
        memoryUsageMB: heartbeatValue?.memoryUsageMB || null,
        staleThresholdMs: WORKER_HEALTHY_THRESHOLD_MS,
      },
      pendingRecords,
      failedRecords,
      manualTasks,
    });
  } catch (error) {
    console.error("Provisioning health error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get provisioning health" } },
      { status: 500 }
    );
  }
}
