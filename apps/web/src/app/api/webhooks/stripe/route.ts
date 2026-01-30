import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/stripe";
import { addProvisioningJob } from "@/lib/queue";
import { sendPurchaseConfirmationEmail, sendAdminAlert } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if we've already processed this (idempotency)
        const existingPurchase = await db.purchase.findUnique({
          where: { stripeSessionId: session.id },
        });

        if (existingPurchase?.status === "COMPLETED") {
          console.log(`Purchase ${session.id} already processed, skipping`);
          return NextResponse.json({ received: true });
        }

        // Update purchase record
        const purchase = await db.purchase.update({
          where: { stripeSessionId: session.id },
          data: {
            status: "COMPLETED",
            stripePaymentIntentId: session.payment_intent as string,
            stripeCustomerId: session.customer as string,
            purchasedAt: new Date(),
          },
        });

        // Get user
        const user = await db.user.findUnique({
          where: { id: purchase.userId },
        });

        if (!user) {
          console.error(`User ${purchase.userId} not found for purchase`);
          break;
        }

        // Get all active strategies
        const strategies = await db.strategy.findMany({
          where: { isActive: true },
        });

        // Create StrategyAccess records for all strategies
        const accessRecords = await Promise.all(
          strategies.map((strategy) =>
            db.strategyAccess.upsert({
              where: {
                userId_strategyId: {
                  userId: purchase.userId,
                  strategyId: strategy.id,
                },
              },
              create: {
                userId: purchase.userId,
                strategyId: strategy.id,
                status: "PENDING",
              },
              update: {
                status: "PENDING",
                retryCount: 0,
                failureReason: null,
              },
            })
          )
        );

        // Queue provisioning job
        const job = await addProvisioningJob("provision-all-strategies", {
          userId: purchase.userId,
          purchaseId: purchase.id,
          accessIds: accessRecords.map((a) => a.id),
        });

        // Update access records with job ID
        if (job) {
          await Promise.all(
            accessRecords.map((access, i) =>
              db.strategyAccess.update({
                where: { id: access.id },
                data: { jobId: `${job.id}-${i}` },
              })
            )
          );
        }

        // Audit log
        await db.auditLog.create({
          data: {
            userId: purchase.userId,
            action: "purchase.completed",
            details: {
              purchaseId: purchase.id,
              amount: purchase.amount,
              strategiesCount: strategies.length,
              stripeSessionId: session.id,
            },
          },
        });

        // Send confirmation email
        await sendPurchaseConfirmationEmail(user.email, {
          name: user.name || undefined,
          amount: purchase.amount,
          strategiesCount: strategies.length,
          purchasedAt: purchase.purchasedAt || new Date(),
        });

        // Notify admin
        await sendAdminAlert("new-purchase", "New Purchase", {
          userId: user.id,
          email: user.email,
          tradingViewUsername: user.tradingViewUsername || "N/A",
          amount: `$${(purchase.amount / 100).toFixed(2)}`,
          strategiesCount: strategies.length,
        });

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Update any purchases with this payment intent
        await db.purchase.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: "FAILED" },
        });

        // Audit log
        const purchase = await db.purchase.findFirst({
          where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (purchase) {
          await db.auditLog.create({
            data: {
              userId: purchase.userId,
              action: "purchase.failed",
              details: {
                purchaseId: purchase.id,
                paymentIntentId: paymentIntent.id,
                failureMessage: paymentIntent.last_payment_error?.message,
              },
            },
          });
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
