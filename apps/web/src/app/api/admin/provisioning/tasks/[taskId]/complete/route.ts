import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";

interface ManualTask {
  id: string;
  type: "grant" | "revoke";
  username: string;
  pineId: string;
  strategyName?: string;
  userEmail?: string;
  userId?: string;
  strategyAccessId?: string;
  createdAt: string;
  status: "pending" | "completed" | "failed";
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const { taskId } = params;
    const body = await req.json().catch(() => ({}));
    const notes = body.notes || "";

    // Find the task
    const config = await prisma.systemConfig.findUnique({
      where: { key: `manual_task:${taskId}` },
    });

    if (!config) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const task = config.value as unknown as ManualTask;

    if (task.status !== "pending") {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Task is not pending" } },
        { status: 400 }
      );
    }

    // Update task status
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    task.completedBy = session.user.email || session.user.id;
    task.notes = notes;

    await prisma.systemConfig.update({
      where: { key: `manual_task:${taskId}` },
      data: { value: task as any },
    });

    // If we have a strategyAccessId, update the access record
    if (task.strategyAccessId) {
      await prisma.strategyAccess.update({
        where: { id: task.strategyAccessId },
        data: {
          status: task.type === "grant" ? "GRANTED" : "REVOKED",
          grantedAt: task.type === "grant" ? new Date() : undefined,
          revokedAt: task.type === "revoke" ? new Date() : undefined,
          failureReason: null,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: task.userId || null,
        action: "provisioning.manual_task_completed",
        details: {
          taskId,
          type: task.type,
          username: task.username,
          pineId: task.pineId,
          completedBy: session.user.email,
          notes,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete manual task error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to complete task" } },
      { status: 500 }
    );
  }
}
