import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, AccessStatus } from "@sts/database";
import { provisioningQueue } from "@/lib/queue";

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

    // Reset to pending
    const updatedAccess = await prisma.strategyAccess.update({
      where: { id: params.id },
      data: {
        status: AccessStatus.PENDING,
        failureReason: null,
      },
    });

    // Queue provisioning job
    const jobId = `retry-${params.id}-${Date.now()}`;
    await provisioningQueue.add(
      "provision",
      {
        strategyAccessId: params.id,
        userId: access.userId,
        strategyId: access.strategyId,
      },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    // Update job ID
    await prisma.strategyAccess.update({
      where: { id: params.id },
      data: { jobId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin.access.retry",
        details: {
          targetUserId: access.userId,
          userEmail: access.user.email,
          strategyId: access.strategyId,
          strategyName: access.strategy.name,
          accessId: params.id,
          newJobId: jobId,
        },
      },
    });

    return NextResponse.json(updatedAccess);
  } catch (error) {
    console.error("Admin retry error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to retry provisioning" } },
      { status: 500 }
    );
  }
}
