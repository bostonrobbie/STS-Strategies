import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const messageSchema = z.object({
  message: z.string().min(5, "Message must be at least 5 characters").max(5000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // Verify ticket belongs to user
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        { status: 404 }
      );
    }

    // Check if ticket is closed
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return NextResponse.json(
        {
          error: {
            code: "TICKET_CLOSED",
            message: "Cannot reply to a closed ticket",
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = messageSchema.safeParse(body);

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

    const { message } = result.data;

    // Create message and update ticket status
    const [newMessage] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId: params.id,
          userId: session.user.id,
          message,
          isFromUser: true,
        },
      }),
      prisma.supportTicket.update({
        where: { id: params.id },
        data: {
          status: "OPEN", // Reset to OPEN when user replies
          updatedAt: new Date(),
        },
      }),
    ]);

    // Notify admin of reply
    if (process.env.ADMIN_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: process.env.ADMIN_EMAIL,
          subject: `[Ticket Reply] ${ticket.subject}`,
          text: `
User replied to ticket:

Ticket ID: ${ticket.id}
User: ${session.user.email}
Subject: ${ticket.subject}

Reply:
${message}

View ticket in admin dashboard.
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to send reply" } },
      { status: 500 }
    );
  }
}
