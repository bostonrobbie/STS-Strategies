import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, TicketStatus } from "@sts/database";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "WAITING_ON_CUSTOMER",
    "RESOLVED",
    "CLOSED",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function PATCH(
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

    const body = await req.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        { status: 404 }
      );
    }

    const { status, priority } = result.data;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        status: status as TicketStatus,
        ...(priority && { priority }),
        ...(status === "RESOLVED" && { resolvedAt: new Date() }),
        ...(status === "CLOSED" && { closedAt: new Date() }),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin.ticket.updated",
        details: {
          ticketId: params.id,
          changes: { status, priority },
          previousStatus: ticket.status,
        },
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update ticket" } },
      { status: 500 }
    );
  }
}
