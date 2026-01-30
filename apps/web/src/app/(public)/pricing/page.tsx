"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { PRICING } from "@sts/shared";
import { formatCurrency } from "@/lib/utils";

const features = [
  "All 6 NQ/NASDAQ trading strategies",
  "Automatic TradingView access provisioning",
  "15 years of backtested historical data",
  "Strategies for all trading sessions",
  "Lifetime updates to existing strategies",
  "Email support",
  "No recurring fees or subscriptions",
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!session) {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    if (!session.user.onboarded) {
      router.push("/onboarding");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "An error occurred");
        return;
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-20 md:py-28">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Simple Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            One Price. Lifetime Access.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant access to all 6 professional NQ trading strategies with
            a single one-time payment. No subscriptions, no recurring fees.
          </p>
        </div>

        {/* Canceled notice */}
        {canceled && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Payment Canceled</p>
              <p className="text-sm text-yellow-700">
                Your payment was canceled. You can try again when you&apos;re ready.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <Card className="border-2 max-w-lg mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Lifetime Access</CardTitle>
            <CardDescription>
              One-time payment for permanent access
            </CardDescription>
            <div className="mt-6">
              <span className="text-6xl font-bold">
                {formatCurrency(PRICING.LIFETIME_AMOUNT)}
              </span>
              <span className="text-muted-foreground ml-2">one-time</span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              disabled={isLoading || status === "loading"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : session ? (
                "Purchase Now"
              ) : (
                "Sign In to Purchase"
              )}
            </Button>

            <Separator className="my-6" />

            {/* No Refund Notice */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                All Sales Are Final
              </h4>
              <p className="text-xs text-muted-foreground">
                We do not offer refunds under any circumstances. By completing
                your purchase, you acknowledge and accept this policy. Please
                review the strategy details and FAQ before purchasing.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What You Get */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            What&apos;s Included
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">6 Professional Strategies</h3>
              <p className="text-sm text-muted-foreground">
                Access to NQ Momentum Alpha, NQ Trend Rider, NQ Breakout Pro, NQ
                Mean Reversion, NQ Power Hour, and NQ Overnight Edge.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Automatic TradingView Access</h3>
              <p className="text-sm text-muted-foreground">
                Your access is provisioned automatically within minutes of
                purchase. No manual approval needed.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Transparent Performance</h3>
              <p className="text-sm text-muted-foreground">
                Full backtest results with equity curves, drawdowns, and win
                rates. We show what the data shows.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Lifetime Updates</h3>
              <p className="text-sm text-muted-foreground">
                Any improvements or updates to the existing strategies are
                included at no additional cost.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Have questions before purchasing?
          </p>
          <Button variant="outline" asChild>
            <Link href="/faq">View FAQ</Link>
          </Button>
        </div>

        {/* Risk Disclaimer */}
        <div className="mt-16 p-6 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-3">Important Risk Disclosure</h3>
          <p className="text-sm text-muted-foreground">
            Trading futures involves substantial risk of loss and is not
            suitable for all investors. Past performance, whether actual or
            indicated by historical tests, is not indicative of future results.
            The strategies provided are for educational and analytical purposes
            only and do not constitute investment advice or recommendations.
          </p>
          <Button variant="link" className="mt-2 p-0 h-auto" asChild>
            <Link href="/disclaimer">Read Full Risk Disclaimer</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
