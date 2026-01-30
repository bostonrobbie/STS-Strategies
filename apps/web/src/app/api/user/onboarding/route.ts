import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onboardingSchema } from "@sts/shared/schemas";
import {
  validateTradingViewUsername,
  shouldBlockCheckout,
} from "@/lib/tradingview-validator";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in first" } },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate input format
    const result = onboardingSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: result.error.errors.map((e) => ({
              field: e.path.join("."),
              reason: e.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const { tradingViewUsername } = result.data;

    // Check if TradingView username is already taken in our system
    const existingUser = await db.user.findUnique({
      where: { tradingViewUsername },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        {
          error: {
            code: "USERNAME_TAKEN",
            message: "This TradingView username is already registered",
          },
        },
        { status: 400 }
      );
    }

    // ===========================================
    // STRICT VALIDATION: Validate username exists on TradingView
    // NO graceful degradation - block if validation fails
    // ===========================================
    const validation = await validateTradingViewUsername(tradingViewUsername);
    const blockResult = shouldBlockCheckout(validation);

    if (blockResult.block) {
      // Audit the validation failure
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "onboarding.validation_failed",
          details: {
            tradingViewUsername,
            reason: validation.reason,
            error: validation.error,
          },
        },
      });

      return NextResponse.json(
        {
          error: {
            code: blockResult.errorCode,
            message: blockResult.message,
          },
        },
        { status: blockResult.statusCode }
      );
    }

    // Update user - ONLY if validation passed
    await db.user.update({
      where: { id: session.user.id },
      data: {
        tradingViewUsername,
        tradingViewUsernameVerified: true, // Set ONLY after successful validation
        onboarded: true,
        termsAcceptedAt: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "user.onboarded",
        details: {
          tradingViewUsername,
          validated: true,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to complete onboarding",
        },
      },
      { status: 500 }
    );
  }
}
