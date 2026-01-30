import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, AccessStatus } from "@sts/database";
import { z } from "zod";

const grantSchema = z.object({
  userId: z.string(),
  strategyId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = grantSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { userId, strategyId } = result.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Check if strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Strategy not found" } },
        { status: 404 }
      );
    }

    // Upsert strategy access (manual grant)
    const access = await prisma.strategyAccess.upsert({
      where: {
        userId_strategyId: { userId, strategyId },
      },
      create: {
        userId,
        strategyId,
        status: AccessStatus.GRANTED,
        grantedAt: new Date(),
      },
      update: {
        status: AccessStatus.GRANTED,
        grantedAt: new Date(),
        failureReason: null,
        revokedAt: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin.access.granted",
        details: {
          targetUserId: userId,
          strategyId,
          strategyName: strategy.name,
          accessId: access.id,
          manual: true,
        },
      },
    });

    return NextResponse.json(access);
  } catch (error) {
    console.error("Admin grant error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to grant access" } },
      { status: 500 }
    );
  }
}
