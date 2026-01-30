"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type ValidationStatus =
  | "idle"
  | "validating"
  | "valid"
  | "invalid"
  | "error"
  | "service_down";

interface ValidationState {
  status: ValidationStatus;
  message: string | null;
  canRetry: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const { toast } = useToast();

  const [tradingViewUsername, setTradingViewUsername] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time validation state
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
    message: null,
    canRetry: false,
  });

  // Debounced validation
  const validateUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setValidation({ status: "idle", message: null, canRetry: false });
      return;
    }

    setValidation({ status: "validating", message: null, canRetry: false });

    try {
      const response = await fetch("/api/user/validate-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidation({
          status: "valid",
          message: "Username verified on TradingView",
          canRetry: false,
        });
      } else {
        const status: ValidationStatus =
          data.reason === "SERVICE_DOWN" || data.reason === "TIMEOUT"
            ? "service_down"
            : data.reason === "INVALID" || data.reason === "USERNAME_TAKEN"
            ? "invalid"
            : "error";

        setValidation({
          status,
          message: data.message,
          canRetry: data.canRetry ?? false,
        });
      }
    } catch {
      setValidation({
        status: "error",
        message: "Unable to validate. Please try again.",
        canRetry: true,
      });
    }
  }, []);

  // Debounce effect - validate 500ms after user stops typing
  useEffect(() => {
    const trimmedUsername = tradingViewUsername.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      setValidation({ status: "idle", message: null, canRetry: false });
      return;
    }

    const timer = setTimeout(() => {
      validateUsername(trimmedUsername);
    }, 500);

    return () => clearTimeout(timer);
  }, [tradingViewUsername, validateUsername]);

  const handleRetryValidation = () => {
    const trimmedUsername = tradingViewUsername.trim();
    if (trimmedUsername) {
      validateUsername(trimmedUsername);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Don't allow submission if username isn't validated
    if (validation.status !== "valid") {
      setError(
        "Please enter a valid TradingView username before continuing."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingViewUsername: tradingViewUsername.trim(),
          acceptTerms,
          acceptDisclaimer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "An error occurred");

        // If validation failed server-side, update local validation state
        if (
          data.error?.code === "VALIDATION_SERVICE_UNAVAILABLE" ||
          response.status === 503
        ) {
          setValidation({
            status: "service_down",
            message: data.error?.message,
            canRetry: true,
          });
        } else if (
          data.error?.code === "USERNAME_INVALID" ||
          data.error?.code === "INVALID_TRADINGVIEW_USERNAME"
        ) {
          setValidation({
            status: "invalid",
            message: data.error?.message,
            canRetry: false,
          });
        }
        return;
      }

      // Update session to reflect onboarded status
      await update();

      toast({
        title: "Welcome!",
        description:
          "Your account is now set up. Redirecting to dashboard...",
      });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if submit should be disabled
  const isSubmitDisabled =
    isLoading ||
    !tradingViewUsername.trim() ||
    !acceptTerms ||
    !acceptDisclaimer ||
    validation.status !== "valid";

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
              <div className="relative">
                <Input
                  id="tradingViewUsername"
                  type="text"
                  placeholder="Your TradingView username"
                  value={tradingViewUsername}
                  onChange={(e) => setTradingViewUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className={
                    validation.status === "valid"
                      ? "border-green-500 pr-10"
                      : validation.status === "invalid"
                      ? "border-destructive pr-10"
                      : validation.status === "service_down" ||
                        validation.status === "error"
                      ? "border-yellow-500 pr-10"
                      : "pr-10"
                  }
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validation.status === "validating" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {validation.status === "valid" && (
                    <CheckCircle2
                      className="h-4 w-4 text-green-500"
                      data-testid="username-valid"
                    />
                  )}
                  {validation.status === "invalid" && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {(validation.status === "service_down" ||
                    validation.status === "error") && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>

              {/* Validation feedback message */}
              {validation.message && (
                <div
                  className={`flex items-center gap-2 text-xs ${
                    validation.status === "valid"
                      ? "text-green-600"
                      : validation.status === "invalid"
                      ? "text-destructive"
                      : "text-yellow-600"
                  }`}
                >
                  <span>{validation.message}</span>
                  {validation.canRetry && (
                    <button
                      type="button"
                      onClick={handleRetryValidation}
                      className="inline-flex items-center gap-1 underline hover:no-underline"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}

              {validation.status === "idle" && (
                <p className="text-xs text-muted-foreground">
                  This is the username you use to log in to TradingView. It will
                  be verified before you can proceed.
                </p>
              )}
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

            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : validation.status === "validating" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying username...
                </>
              ) : validation.status !== "valid" &&
                tradingViewUsername.trim().length >= 3 ? (
                "Verify username to continue"
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
              <li>
                It&apos;s also shown in your profile URL:
                tradingview.com/u/[username]
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
