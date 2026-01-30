import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { contactRateLimiter } from "@/lib/redis";
import { contactFormSchema } from "@sts/shared/schemas";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = process.env.ADMIN_EMAIL;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = headers().get("x-forwarded-for") || "127.0.0.1";
    const { success, remaining } = await contactRateLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Validate input
    const result = contactFormSchema.safeParse(body);
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

    const { name, email, subject, message } = result.data;

    // Send email to admin
    if (adminEmail) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: adminEmail,
        subject: `[Contact Form] ${subject}`,
        text: `
New contact form submission:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Sent from STS Strategies contact form
        `.trim(),
      });
    }

    // Send confirmation to user
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to: email,
      subject: "We received your message - STS Strategies",
      text: `
Hi ${name},

Thank you for contacting STS Strategies. We've received your message and will get back to you within 24-48 hours.

Your message:
---
Subject: ${subject}

${message}
---

Best regards,
STS Strategies Team
      `.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to send message",
        },
      },
      { status: 500 }
    );
  }
}
