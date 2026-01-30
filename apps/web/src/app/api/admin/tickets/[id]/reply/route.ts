import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, TicketStatus } from "@sts/database";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const replySchema = z.object({
  message: z.string().min(1).max(10000),
  isInternal: z.boolean().default(false),
});

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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const result = replySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { message, isInternal } = result.data;

    // Create message
    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: params.id,
        userId: session.user.id,
        message,
        isInternal,
        isFromUser: false,
      },
    });

    // Update ticket status if it was waiting on customer
    const newStatus = isInternal
      ? ticket.status
      : ticket.status === "OPEN"
        ? TicketStatus.IN_PROGRESS
        : TicketStatus.WAITING_ON_CUSTOMER;

    await prisma.supportTicket.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Send email notification to customer (only for non-internal messages)
    if (!isInternal && ticket.user.email) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: ticket.user.email,
          subject: `Re: ${ticket.subject} - STS Strategies`,
          text: `
Hi ${ticket.user.name || "there"},

We've responded to your support ticket.

---
${message}
---

View the full conversation:
${process.env.NEXT_PUBLIC_APP_URL}/dashboard/support/${ticket.id}

Best regards,
STS Strategies Support
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send ticket reply email:", emailError);
      }
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Ticket reply error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send reply" } },
      { status: 500 }
    );
  }
}
