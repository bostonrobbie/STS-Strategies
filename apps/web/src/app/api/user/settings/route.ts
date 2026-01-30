import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tradingViewUsername: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        tradingViewUsername: true,
        onboarded: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get settings" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = updateSettingsSchema.safeParse(body);

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

    const { name, tradingViewUsername } = result.data;

    // Check if TradingView username is already taken
    if (tradingViewUsername) {
      const existing = await prisma.user.findFirst({
        where: {
          tradingViewUsername,
          NOT: { id: session.user.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: {
              code: "USERNAME_TAKEN",
              message: "This TradingView username is already linked to another account",
            },
          },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(tradingViewUsername !== undefined && { tradingViewUsername }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        tradingViewUsername: true,
        onboarded: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "user.settings_updated",
        details: {
          changes: {
            ...(name !== undefined && { name }),
            ...(tradingViewUsername !== undefined && { tradingViewUsername }),
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update settings" } },
      { status: 500 }
    );
  }
}
