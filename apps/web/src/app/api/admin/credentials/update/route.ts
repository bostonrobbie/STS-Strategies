/**
 * POST /api/admin/credentials/update
 *
 * Validates, encrypts, and stores new TradingView credentials.
 * Automatically switches service mode to AUTO if credentials are valid.
 *
 * INCIDENT RECOVERY:
 * - Sets provisioning_state to HEALTHY
 * - Resumes all PENDING provisioning jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  prisma,
  encryptCredentials,
  isEncryptionConfigured,
} from "@sts/database";
import { z } from "zod";
import { setHealthy, getProvisioningState } from "@/lib/provisioning-state";
import { resumePendingJobs, getPendingJobsCount } from "@/lib/job-resume";

const updateSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  signature: z.string().min(1, "Signature is required"),
  apiUrl: z.string().url("Must be a valid URL").optional(),
});

const REQUEST_TIMEOUT_MS = 15000;
const SERVICE_MODE_KEY = "provisioning_service_mode";
const PROVISIONING_STATE_KEY = "provisioning_state";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    // Check encryption is configured
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message:
              "Encryption key not configured. Set CREDENTIAL_ENCRYPTION_KEY environment variable.",
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.errors[0].message,
          },
        },
        { status: 400 }
      );
    }

    const { sessionId, signature, apiUrl } = validation.data;

    // Use provided URL or fall back to env var
    const effectiveApiUrl = apiUrl || process.env.TV_ACCESS_API_URL;

    if (!effectiveApiUrl) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message:
              "API URL is required. Provide it in the request or set TV_ACCESS_API_URL.",
          },
        },
        { status: 400 }
      );
    }

    // First, validate the credentials
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const testUrl = `${effectiveApiUrl}/validate/TradingView`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
          "X-Signature": signature,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "credentials.update_validation_failed",
            details: {
              apiUrl: effectiveApiUrl,
              httpStatus: response.status,
            },
          },
        });

        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: `Credentials validation failed: HTTP ${response.status}`,
            },
          },
          { status: 400 }
        );
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      const errorMessage =
        fetchError instanceof Error
          ? fetchError.name === "AbortError"
            ? "Request timed out"
            : fetchError.message
          : "Unknown error";

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "credentials.update_validation_failed",
          details: {
            apiUrl: effectiveApiUrl,
            error: errorMessage,
          },
        },
      });

      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: `Credentials validation failed: ${errorMessage}`,
          },
        },
        { status: 400 }
      );
    }

    // Credentials are valid - encrypt and store
    const encrypted = encryptCredentials({
      sessionId,
      signature,
    });

    // Check current state before update (for reporting)
    const previousState = await getProvisioningState();
    const pendingJobsCount = await getPendingJobsCount();
    const wasInIncident = previousState.state === "DEGRADED";

    // Store in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate existing credentials
      await tx.tradingViewCredential.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new credential
      const credential = await tx.tradingViewCredential.create({
        data: {
          sessionIdEncrypted: encrypted.sessionIdEncrypted,
          signatureEncrypted: encrypted.signatureEncrypted,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          apiUrl: effectiveApiUrl,
          isActive: true,
          validatedAt: new Date(),
          createdBy: session.user.id,
        },
      });

      // Update service mode to AUTO
      await tx.systemConfig.upsert({
        where: { key: SERVICE_MODE_KEY },
        update: {
          value: {
            mode: "AUTO",
            reason: "Credentials updated and validated",
            changedAt: new Date().toISOString(),
            changedBy: session.user.id,
          },
        },
        create: {
          key: SERVICE_MODE_KEY,
          value: {
            mode: "AUTO",
            reason: "Credentials updated and validated",
            changedAt: new Date().toISOString(),
            changedBy: session.user.id,
          },
        },
      });

      // Set provisioning_state to HEALTHY
      const healthyAt = new Date().toISOString();
      await tx.systemConfig.upsert({
        where: { key: PROVISIONING_STATE_KEY },
        update: {
          value: {
            state: "HEALTHY",
            healthyAt,
            lastCheckedAt: healthyAt,
            // Clear incident data
            reason: undefined,
            degradedAt: undefined,
            incidentId: undefined,
          },
        },
        create: {
          key: PROVISIONING_STATE_KEY,
          value: {
            state: "HEALTHY",
            healthyAt,
            lastCheckedAt: healthyAt,
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "credentials.updated",
          details: {
            credentialId: credential.id,
            apiUrl: effectiveApiUrl,
            modeChangedTo: "AUTO",
            wasInIncident,
            previousIncidentId: previousState.incidentId,
            pendingJobsAtRecovery: pendingJobsCount,
          },
        },
      });

      return credential;
    });

    // Resume pending jobs (outside transaction)
    let resumeResult = null;
    if (pendingJobsCount > 0) {
      try {
        resumeResult = await resumePendingJobs(session.user.id);
        console.log(
          `[Credentials] Resumed ${resumeResult.requeued} jobs after credential update`
        );
      } catch (resumeError) {
        console.error("[Credentials] Failed to resume jobs:", resumeError);
        // Don't fail the whole operation - credentials are updated
      }
    }

    return NextResponse.json({
      success: true,
      credentialId: result.id,
      mode: "AUTO",
      message: wasInIncident
        ? `Incident resolved. Credentials saved and ${resumeResult?.requeued || 0} pending jobs resumed.`
        : "Credentials saved and service mode set to AUTO",
      recovery: wasInIncident
        ? {
            wasInIncident: true,
            previousIncidentId: previousState.incidentId,
            jobsResumed: resumeResult?.requeued || 0,
            jobsFailed: resumeResult?.failed || 0,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Credential update error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update credentials",
        },
      },
      { status: 500 }
    );
  }
}
