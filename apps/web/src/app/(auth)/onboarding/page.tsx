"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const [tradingViewUsername, setTradingViewUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingViewUsername,
          acceptTerms,
          acceptDisclaimer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "An error occurred");
        return;
      }

      // Update session to reflect onboarded status
      await update();

      toast({
        title: "Welcome!",
        description: "Your account is now set up. Redirecting to dashboard...",
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight mb-2">
            STS Strategies
          </Link>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Enter your TradingView username to receive access to strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tradingViewUsername">TradingView Username</Label>
              <Input
                id="tradingViewUsername"
                type="text"
                placeholder="Your TradingView username"
                value={tradingViewUsername}
                onChange={(e) => setTradingViewUsername(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This is the username you use to log in to TradingView. It is
                case-sensitive.
              </p>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) =>
                    setAcceptTerms(checked as boolean)
                  }
                  disabled={isLoading}
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="cursor-pointer">
                    I accept the Terms of Service
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline hover:text-foreground"
                      target="_blank"
                    >
                      Terms of Service
                    </Link>{" "}
                    including our no-refund policy.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="disclaimer"
                  checked={acceptDisclaimer}
                  onCheckedChange={(checked) =>
                    setAcceptDisclaimer(checked as boolean)
                  }
                  disabled={isLoading}
                />
                <div className="space-y-1">
                  <Label htmlFor="disclaimer" className="cursor-pointer">
                    I acknowledge the Risk Disclaimer
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    I understand that trading futures involves substantial risk
                    of loss, past performance is not indicative of future
                    results, and these strategies are for educational purposes
                    only.{" "}
                    <Link
                      href="/disclaimer"
                      className="underline hover:text-foreground"
                      target="_blank"
                    >
                      Read full disclaimer
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                !tradingViewUsername ||
                !acceptTerms ||
                !acceptDisclaimer
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">
              How to find your TradingView username:
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Log in to TradingView.com</li>
              <li>Click on your profile icon in the top right</li>
              <li>Your username is displayed at the top of the menu</li>
              <li>It&apos;s also shown in your profile URL: tradingview.com/u/[username]</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
