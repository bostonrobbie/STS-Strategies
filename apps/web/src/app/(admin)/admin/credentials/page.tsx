"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Key,
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CredentialStatus {
  hasCredentials: boolean;
  isValid: boolean;
  lastValidatedAt: string | null;
  credentialAgeHours: number | null;
  apiUrl: string | null;
  mode: "AUTO" | "MANUAL" | "DISABLED";
  credentialHistory: {
    id: string;
    createdAt: string;
    validatedAt: string | null;
    isActive: boolean;
    createdBy: string | null;
  }[];
}

export default function CredentialsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CredentialStatus | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [sessionId, setSessionId] = useState("");
  const [signature, setSignature] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/credentials/status");
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      setStatus(data);
      if (data.apiUrl) {
        setApiUrl(data.apiUrl);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch credential status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!sessionId || !signature) {
      toast({
        title: "Validation Error",
        description: "Session ID and Signature are required",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch("/api/admin/credentials/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          signature,
          apiUrl: apiUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setValidationResult({ valid: false, error: data.error.message });
        toast({
          title: "Validation Failed",
          description: data.error.message,
          variant: "destructive",
        });
      } else {
        setValidationResult({ valid: data.valid, error: data.error });
        if (data.valid) {
          toast({
            title: "Credentials Valid",
            description: "Credentials validated successfully. You can now save them.",
          });
        } else {
          toast({
            title: "Credentials Invalid",
            description: data.error || "Credentials could not be validated",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate credentials",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!sessionId || !signature) {
      toast({
        title: "Validation Error",
        description: "Session ID and Signature are required",
        variant: "destructive",
      });
      return;
    }

    if (!validationResult?.valid) {
      toast({
        title: "Validation Required",
        description: "Please validate credentials before saving",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/credentials/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          signature,
          apiUrl: apiUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      toast({
        title: "Credentials Saved",
        description: "Credentials saved and service mode set to AUTO",
      });

      // Clear form and refresh status
      setSessionId("");
      setSignature("");
      setValidationResult(null);
      await fetchStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function getModeBadge(mode: string) {
    switch (mode) {
      case "AUTO":
        return <Badge className="bg-green-100 text-green-800">AUTO</Badge>;
      case "MANUAL":
        return <Badge className="bg-yellow-100 text-yellow-800">MANUAL</Badge>;
      case "DISABLED":
        return <Badge className="bg-red-100 text-red-800">DISABLED</Badge>;
      default:
        return <Badge>{mode}</Badge>;
    }
  }

  function getCredentialAgeBadge(hours: number | null) {
    if (hours === null) return null;

    const days = Math.floor(hours / 24);

    if (days >= 14) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {days} days old - Refresh Now
        </Badge>
      );
    }

    if (days >= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {days} days old - Refresh Soon
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        {days} days old
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TradingView Credentials</h1>
          <p className="text-muted-foreground mt-1">
            Manage TradingView API credentials for automated provisioning
          </p>
        </div>
        <Button onClick={fetchStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Service Mode</p>
                <div className="mt-1">{getModeBadge(status.mode)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credentials</p>
                <div className="mt-1 flex items-center gap-2">
                  {status.hasCredentials ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Not configured</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Validated</p>
                <p className="text-sm mt-1">
                  {status.lastValidatedAt
                    ? new Date(status.lastValidatedAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credential Age</p>
                <div className="mt-1">
                  {getCredentialAgeBadge(status.credentialAgeHours)}
                </div>
              </div>
            </div>

            {status.apiUrl && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">API URL</p>
                <p className="text-sm font-mono mt-1">{status.apiUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warning if credentials are old */}
      {status?.credentialAgeHours && status.credentialAgeHours >= 7 * 24 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">
                  Credentials may need refresh
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  TradingView session cookies can expire. Consider refreshing your
                  credentials to avoid service interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Update Credentials
          </CardTitle>
          <CardDescription>
            Enter your TradingView session cookies. Get these from browser DevTools
            after logging into TradingView.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL (optional)</Label>
            <Input
              id="apiUrl"
              placeholder="https://your-tv-api.example.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the configured TV_ACCESS_API_URL environment variable
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionId">Session ID (sessionid cookie)</Label>
            <Input
              id="sessionId"
              type="password"
              placeholder="Enter sessionid cookie value"
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setValidationResult(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">Signature (sessionid_sign cookie)</Label>
            <Input
              id="signature"
              type="password"
              placeholder="Enter sessionid_sign cookie value"
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value);
                setValidationResult(null);
              }}
            />
          </div>

          {validationResult && (
            <div
              className={`p-3 rounded-lg ${
                validationResult.valid
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      Credentials validated successfully
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">
                      {validationResult.error || "Validation failed"}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={validating || !sessionId || !signature}
            >
              {validating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Validate
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !validationResult?.valid}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Save & Activate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get TradingView Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Log into TradingView with your bot account</li>
            <li>Open browser DevTools (F12 or Right-click &gt; Inspect)</li>
            <li>Go to Application tab &gt; Cookies &gt; tradingview.com</li>
            <li>
              Find and copy the <code className="font-mono bg-muted px-1">sessionid</code> cookie value
            </li>
            <li>
              Find and copy the <code className="font-mono bg-muted px-1">sessionid_sign</code> cookie value
            </li>
            <li>Paste them in the form above and click Validate</li>
            <li>If valid, click Save & Activate to store and enable auto-provisioning</li>
          </ol>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Important Notes
            </h4>
            <ul className="mt-2 text-sm text-amber-700 space-y-1">
              <li>- Session cookies expire periodically (timing varies)</li>
              <li>- You&apos;ll receive alerts when credentials are older than 7 days</li>
              <li>- 2FA prevents fully automated credential refresh</li>
              <li>- Keep this page bookmarked for quick credential updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Credential History */}
      {status?.credentialHistory && status.credentialHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Credential History</CardTitle>
            <CardDescription>Recent credential updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.credentialHistory.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(cred.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cred.validatedAt
                        ? `Validated: ${new Date(cred.validatedAt).toLocaleString()}`
                        : "Not validated"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cred.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
