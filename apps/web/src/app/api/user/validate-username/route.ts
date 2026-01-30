import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  validateTradingViewUsername,
  shouldBlockCheckout,
} from "@/lib/tradingview-validator";
import { tradingViewUsernameSchema } from "@sts/shared/schemas";

/**
 * POST /api/user/validate-username
 *
 * Real-time TradingView username validation for onboarding UI.
 * Returns validation status without storing anything.
 */
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
    const { username } = body;

    // Validate format first
    const formatResult = tradingViewUsernameSchema.safeParse(username);
    if (!formatResult.success) {
      return NextResponse.json({
        valid: false,
        reason: "FORMAT_ERROR",
        message: formatResult.error.errors[0]?.message || "Invalid username format",
      });
    }

    // Check if username is already taken in our system (by another user)
    const existingUser = await db.user.findUnique({
      where: { tradingViewUsername: username },
    });

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json({
        valid: false,
        reason: "USERNAME_TAKEN",
        message: "This TradingView username is already registered with another account",
      });
    }

    // Validate against TradingView
    const validation = await validateTradingViewUsername(username);
    const blockResult = shouldBlockCheckout(validation);

    if (blockResult.block) {
      // For UI feedback, we provide more user-friendly messages
      let message = blockResult.message;

      if (validation.reason === "INVALID") {
        message = "This TradingView username does not exist. Please check for typos.";
      } else if (validation.reason === "SERVICE_DOWN" || validation.reason === "TIMEOUT") {
        message = "Unable to verify username right now. Please try again in a moment.";
      } else if (validation.reason === "RATE_LIMITED") {
        message = "Too many attempts. Please wait a moment before trying again.";
      }

      return NextResponse.json({
        valid: false,
        reason: validation.reason,
        message,
        canRetry: validation.reason !== "INVALID",
      });
    }

    // Success
    return NextResponse.json({
      valid: true,
      reason: "VALID",
      message: "TradingView username verified",
      username: validation.username,
    });
  } catch (error) {
    console.error("Username validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        reason: "ERROR",
        message: "Validation failed. Please try again.",
        canRetry: true,
      },
      { status: 500 }
    );
  }
}
