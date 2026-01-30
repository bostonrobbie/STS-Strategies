import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, AccessStatus } from "@sts/database";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const access = await prisma.strategyAccess.findUnique({
      where: { id: params.id },
      include: { strategy: true, user: true },
    });

    if (!access) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Access record not found" } },
        { status: 404 }
      );
    }

    // Update to revoked
    const updatedAccess = await prisma.strategyAccess.update({
      where: { id: params.id },
      data: {
        status: AccessStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin.access.revoked",
        details: {
          targetUserId: access.userId,
          userEmail: access.user.email,
          strategyId: access.strategyId,
          strategyName: access.strategy.name,
          accessId: params.id,
        },
      },
    });

    return NextResponse.json(updatedAccess);
  } catch (error) {
    console.error("Admin revoke error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to revoke access" } },
      { status: 500 }
    );
  }
}
