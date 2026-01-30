/**
 * POST /api/admin/credentials/update
 *
 * Validates, encrypts, and stores new TradingView credentials.
 * Automatically switches service mode to AUTO if credentials are valid.
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

const updateSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  signature: z.string().min(1, "Signature is required"),
  apiUrl: z.string().url("Must be a valid URL").optional(),
});

const REQUEST_TIMEOUT_MS = 15000;
const SERVICE_MODE_KEY = "provisioning_service_mode";

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

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "credentials.updated",
          details: {
            credentialId: credential.id,
            apiUrl: effectiveApiUrl,
            modeChangedTo: "AUTO",
          },
        },
      });

      return credential;
    });

    return NextResponse.json({
      success: true,
      credentialId: result.id,
      mode: "AUTO",
      message: "Credentials saved and service mode set to AUTO",
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
