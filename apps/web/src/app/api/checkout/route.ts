import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

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

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      tradingViewUsername: user.tradingViewUsername,
      successUrl: absoluteUrl("/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}"),
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
