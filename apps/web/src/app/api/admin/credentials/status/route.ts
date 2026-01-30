/**
 * GET /api/admin/credentials/status
 *
 * Returns the current TradingView credential status and service mode.
 * Includes provisioning state for DEGRADED indicator.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { getProvisioningState, type ProvisioningStateValue } from "@/lib/provisioning-state";

interface CredentialStatus {
  hasCredentials: boolean;
  isValid: boolean;
  lastValidatedAt: string | null;
  credentialAgeHours: number | null;
  apiUrl: string | null;
  mode: "AUTO" | "MANUAL" | "DISABLED";
  // Provisioning state for incident handling
  provisioningState: ProvisioningStateValue;
  degradedAt: string | null;
  degradedReason: string | null;
  incidentId: string | null;
  pendingJobsCount: number;
  credentialHistory: {
    id: string;
    createdAt: string;
    validatedAt: string | null;
    isActive: boolean;
    createdBy: string | null;
  }[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    // Get active credential
    const activeCredential = await prisma.tradingViewCredential.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Get credential history
    const credentialHistory = await prisma.tradingViewCredential.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        validatedAt: true,
        isActive: true,
        createdBy: true,
        apiUrl: true,
      },
    });

    // Check for env var fallback
    const hasEnvCredentials = !!(
      process.env.TV_ACCESS_API_URL &&
      process.env.TV_SESSION_ID &&
      process.env.TV_SIGNATURE
    );

    // Get service mode from SystemConfig
    const modeConfig = await prisma.systemConfig.findUnique({
      where: { key: "provisioning_service_mode" },
    });

    const mode = (modeConfig?.value as { mode: string } | null)?.mode as
      | "AUTO"
      | "MANUAL"
      | "DISABLED"
      | null;

    // Calculate credential age
    let credentialAgeHours: number | null = null;
    if (activeCredential) {
      const ageMs = Date.now() - activeCredential.createdAt.getTime();
      credentialAgeHours = Math.floor(ageMs / (1000 * 60 * 60));
    }

    // Determine effective mode
    const effectiveMode: "AUTO" | "MANUAL" | "DISABLED" =
      mode ||
      (activeCredential || hasEnvCredentials ? "AUTO" : "MANUAL");

    // Get provisioning state
    const provisioningState = await getProvisioningState();

    // Count pending jobs
    const pendingJobsCount = await prisma.strategyAccess.count({
      where: { status: "PENDING" },
    });

    const status: CredentialStatus = {
      hasCredentials: !!activeCredential || hasEnvCredentials,
      isValid: activeCredential?.validatedAt !== null || hasEnvCredentials,
      lastValidatedAt: activeCredential?.validatedAt?.toISOString() || null,
      credentialAgeHours,
      apiUrl: activeCredential?.apiUrl || process.env.TV_ACCESS_API_URL || null,
      mode: effectiveMode,
      // Provisioning state info
      provisioningState: provisioningState.state,
      degradedAt: provisioningState.degradedAt || null,
      degradedReason: provisioningState.reason || null,
      incidentId: provisioningState.incidentId || null,
      pendingJobsCount,
      credentialHistory: credentialHistory.map((c) => ({
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        validatedAt: c.validatedAt?.toISOString() || null,
        isActive: c.isActive,
        createdBy: c.createdBy,
      })),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Credential status error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get credential status" } },
      { status: 500 }
    );
  }
}
