/**
 * POST /api/admin/credentials/validate
 *
 * Tests TradingView credentials without saving them.
 * Used by admin UI to validate credentials before storing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { z } from "zod";

const validateSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  signature: z.string().min(1, "Signature is required"),
  apiUrl: z.string().url("Must be a valid URL").optional(),
});

const REQUEST_TIMEOUT_MS = 15000;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateSchema.safeParse(body);

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
            message: "API URL is required. Provide it in the request or set TV_ACCESS_API_URL.",
          },
        },
        { status: 400 }
      );
    }

    // Test the credentials by calling the validate endpoint
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
        // Log the attempt
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "credentials.validate_failed",
            details: {
              apiUrl: effectiveApiUrl,
              httpStatus: response.status,
              error: `HTTP ${response.status}`,
            },
          },
        });

        return NextResponse.json({
          valid: false,
          error: `TradingView API returned error: ${response.status}`,
        });
      }

      // Log successful validation
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "credentials.validate_success",
          details: {
            apiUrl: effectiveApiUrl,
          },
        },
      });

      return NextResponse.json({
        valid: true,
        message: "Credentials validated successfully",
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      const errorMessage =
        fetchError instanceof Error
          ? fetchError.name === "AbortError"
            ? "Request timed out"
            : fetchError.message
          : "Unknown error";

      // Log the attempt
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "credentials.validate_failed",
          details: {
            apiUrl: effectiveApiUrl,
            error: errorMessage,
          },
        },
      });

      return NextResponse.json({
        valid: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error("Credential validation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to validate credentials" } },
      { status: 500 }
    );
  }
}
