import { NextRequest, NextResponse } from "next/server";
import { db } from "@sts/database";
import {
  hashPassword,
  validatePassword,
  isResetTokenExpired,
} from "@/lib/password";
import { z } from "zod";

const confirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = confirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Find user with this reset token
    const user = await db.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpiry) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (isResetTokenExpired(user.passwordResetExpiry)) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        emailVerified: user.emailVerified || new Date(), // Verify email if not already
      },
    });

    // Log password reset
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "user.password_reset_completed",
        details: {
          email: user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Password reset confirmation error:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while resetting your password. Please try again.",
      },
      { status: 500 }
    );
  }
}
