import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { onboardingSchema } from "@sts/shared/schemas";

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

    // Validate input
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

    // Check if TradingView username is already taken
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

    // Update user
    await db.user.update({
      where: { id: session.user.id },
      data: {
        tradingViewUsername,
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
