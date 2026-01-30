import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { createTicketSchema } from "@sts/shared/schemas";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          where: { isInternal: false },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Get tickets error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get tickets" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = createTicketSchema.safeParse(body);

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

    const { subject, category, message } = result.data;

    // Create ticket with first message
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        category,
        status: "OPEN",
        priority: "MEDIUM",
        messages: {
          create: {
            userId: session.user.id,
            message,
            isFromUser: true,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ticket.created",
        details: {
          ticketId: ticket.id,
          subject,
          category,
        },
      },
    });

    // Send confirmation email
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: session.user.email!,
        subject: `Ticket Created: ${subject} - STS Strategies`,
        text: `
Hi ${session.user.name || "there"},

Your support ticket has been created successfully.

Ticket ID: ${ticket.id.slice(-6)}
Subject: ${subject}
Category: ${category || "Other"}

We'll respond within 24-48 hours. You can view your ticket at:
${process.env.NEXT_PUBLIC_APP_URL}/dashboard/support/${ticket.id}

Best regards,
STS Strategies Support
        `.trim(),
      });
    } catch (emailError) {
      console.error("Failed to send ticket confirmation email:", emailError);
    }

    // Notify admin
    if (process.env.ADMIN_EMAIL) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: process.env.ADMIN_EMAIL,
          subject: `[New Ticket] ${subject}`,
          text: `
New support ticket created:

Ticket ID: ${ticket.id}
User: ${session.user.email}
Subject: ${subject}
Category: ${category || "Other"}

Message:
${message}

View ticket in admin dashboard.
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } },
      { status: 500 }
    );
  }
}
