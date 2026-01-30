import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import {
  validateTradingViewUsername,
  shouldBlockCheckout,
} from "@/lib/tradingview-validator";
import { getProvisioningState } from "@/lib/provisioning-state";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in first" } },
        { status: 401 }
      );
    }

    // Get user with purchase info
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        purchases: {
          where: { status: "COMPLETED" },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Check if onboarded
    if (!user.onboarded || !user.tradingViewUsername) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_ONBOARDED",
            message: "Please complete onboarding first",
          },
        },
        { status: 400 }
      );
    }

    // Check if already purchased
    if (user.purchases.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_PURCHASED",
            message: "You already have lifetime access",
          },
        },
        { status: 400 }
      );
    }

    // ===========================================
    // PROVISIONING STATE CHECK - Block if DEGRADED
    // When system is in DEGRADED state (credential failure),
    // we block checkout to prevent users from paying for
    // access that cannot be provisioned.
    // ===========================================
    const provisioningState = await getProvisioningState();
    if (provisioningState.state === "DEGRADED") {
      // Audit the blocked checkout
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "checkout.blocked_degraded",
          details: {
            reason: provisioningState.reason,
            degradedAt: provisioningState.degradedAt,
            incidentId: provisioningState.incidentId,
          },
        },
      });

      return NextResponse.json(
        {
          error: {
            code: "SERVICE_TEMPORARILY_UNAVAILABLE",
            message:
              "We're currently performing maintenance. Please try again in a few minutes.",
          },
        },
        { status: 503 }
      );
    }

    // ===========================================
    // STRICT VALIDATION GATE - Defense in Depth
    // Even if username was verified at onboarding,
    // re-validate at checkout time
    // ===========================================

    // First check: Username must be verified (from onboarding)
    if (!user.tradingViewUsernameVerified) {
      return NextResponse.json(
        {
          error: {
            code: "USERNAME_NOT_VERIFIED",
            message:
              "Your TradingView username must be verified before purchase. Please update it in settings.",
          },
        },
        { status: 403 }
      );
    }

    // Second check: Re-validate at checkout (defense in depth)
    const validation = await validateTradingViewUsername(
      user.tradingViewUsername
    );
    const blockResult = shouldBlockCheckout(validation);

    if (blockResult.block) {
      // If validation fails now, invalidate the stored verification
      if (validation.reason === "INVALID") {
        await db.user.update({
          where: { id: user.id },
          data: { tradingViewUsernameVerified: false },
        });
      }

      // Audit the validation failure at checkout
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "checkout.validation_failed",
          details: {
            tradingViewUsername: user.tradingViewUsername,
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

    // ===========================================
    // Validation passed - proceed with checkout
    // ===========================================

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      tradingViewUsername: user.tradingViewUsername,
      successUrl: absoluteUrl(
        "/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}"
      ),
      cancelUrl: absoluteUrl("/pricing?canceled=true"),
    });

    // Create pending purchase record
    await db.purchase.create({
      data: {
        userId: user.id,
        stripeSessionId: checkoutSession.id,
        amount: 9900, // $99.00
        currency: "usd",
        status: "PENDING",
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "checkout.initiated",
        details: {
          sessionId: checkoutSession.id,
          usernameValidated: true,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create checkout session",
        },
      },
      { status: 500 }
    );
  }
}
