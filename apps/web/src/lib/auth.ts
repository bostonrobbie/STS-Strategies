import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@sts/database";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { MagicLinkEmail } from "@sts/email";
import { verifyPassword } from "./password";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Find user by email
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboarded: user.onboarded,
          tradingViewUsername: user.tradingViewUsername,
        };
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: email,
          subject: "Sign in to STS Strategies",
          html: await render(MagicLinkEmail({ url, expires: "24 hours" })),
        });

        if (result.error) {
          throw new Error(`Failed to send email: ${result.error.message}`);
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Log the sign-in
      if (user.id) {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "user.login",
            details: {
              provider: account?.provider || "credentials",
            },
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign in - fetch user data
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            onboarded: true,
            tradingViewUsername: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.onboarded = dbUser.onboarded;
          token.tradingViewUsername = dbUser.tradingViewUsername;
        }
      }

      // Refresh user data on update trigger
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            onboarded: true,
            tradingViewUsername: true,
          },
        });

        if (dbUser) {
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.onboarded = dbUser.onboarded;
          token.tradingViewUsername = dbUser.tradingViewUsername;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
        session.user.onboarded = token.onboarded as boolean;
        session.user.tradingViewUsername = token.tradingViewUsername as
          | string
          | null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Log user creation
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "user.created",
          details: {
            email: user.email,
          },
        },
      });

      // Send welcome email
      if (user.email) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: user.email,
          subject: "Welcome to STS Strategies",
          html: await render(
            (await import("@sts/email")).WelcomeEmail({
              name: user.name || undefined,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            })
          ),
        });
      }
    },
  },
};

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "USER" | "ADMIN";
      onboarded: boolean;
      tradingViewUsername: string | null;
    };
  }

  interface User {
    role: "USER" | "ADMIN";
    onboarded: boolean;
    tradingViewUsername: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    onboarded: boolean;
    tradingViewUsername: string | null;
  }
}
