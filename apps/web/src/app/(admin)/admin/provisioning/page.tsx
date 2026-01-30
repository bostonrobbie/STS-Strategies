"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
  RefreshCw,
  XCircle,
  Activity,
  Server,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AccessRecord {
  id: string;
  status: string;
  failureReason: string | null;
  retryCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    name: string | null;
    tradingViewUsername: string | null;
  };
  strategy: {
    name: string;
    pineId: string;
  };
}

interface ManualTask {
  id: string;
  type: "grant" | "revoke";
  username: string;
  pineId: string;
  strategyName?: string;
  userEmail?: string;
  createdAt: string;
  status: "pending" | "completed" | "failed";
}

interface HealthStatus {
  mode: string;
  configured: boolean;
  fallbackMode: string;
  fallbackConfigured: boolean;
  status: "healthy" | "degraded" | "manual-only";
}

interface ProvisioningStats {
  pending: number;
  failed: number;
  granted: number;
  revoked: number;
  manualTasks: number;
}

export default function ProvisioningHealthPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProvisioningStats>({
    pending: 0,
    failed: 0,
    granted: 0,
    revoked: 0,
    manualTasks: 0,
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [pendingRecords, setPendingRecords] = useState<AccessRecord[]>([]);
  const [failedRecords, setFailedRecords] = useState<AccessRecord[]>([]);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/provisioning/health");
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      setStats(data.stats);
      setHealth(data.health);
      setPendingRecords(data.pendingRecords || []);
      setFailedRecords(data.failedRecords || []);
      setManualTasks(data.manualTasks || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch provisioning data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(accessId: string) {
    setRetrying(accessId);
    try {
      const response = await fetch(`/api/admin/access/${accessId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Retry failed");
      }

      toast({
        title: "Retry queued",
        description: "The provisioning job has been queued for retry",
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry provisioning",
        variant: "destructive",
      });
    } finally {
      setRetrying(null);
    }
  }

  async function handleCompleteManualTask(taskId: string) {
    try {
      const response = await fetch(`/api/admin/provisioning/tasks/${taskId}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to complete task");
      }

      toast({
        title: "Task completed",
        description: "The manual task has been marked as completed",
      });

      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete task",
        variant: "destructive",
      });
    }
  }

  function getHealthBadge(status: string) {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case "degraded":
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case "manual-only":
        return <Badge className="bg-red-100 text-red-800">Manual Only</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
          <h1 className="text-3xl font-bold">Provisioning Health</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage TradingView access provisioning
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getHealthBadge(health.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primary Mode</p>
                <p className="font-medium">{health.mode}</p>
                <p className="text-xs text-muted-foreground">
                  {health.configured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fallback Mode</p>
                <p className="font-medium">{health.fallbackMode}</p>
                <p className="text-xs text-muted-foreground">
                  {health.fallbackConfigured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manual Tasks</p>
                <p className="font-medium text-2xl">{stats.manualTasks}</p>
                <p className="text-xs text-muted-foreground">pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Granted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.granted}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              Revoked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {stats.revoked}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Tasks */}
      {manualTasks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Manual Tasks Required ({manualTasks.length})
            </CardTitle>
            <CardDescription>
              These tasks require manual action in TradingView
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {manualTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background"
                >
                  <div>
                    <p className="font-medium">
                      {task.type === "grant" ? "Grant Access" : "Revoke Access"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      TV: <span className="font-mono">{task.username}</span> •{" "}
                      {task.strategyName || task.pineId}
                    </p>
                    {task.userEmail && (
                      <p className="text-sm text-muted-foreground">
                        User: {task.userEmail}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.status}</Badge>
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteManualTask(task.id)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Records */}
      {failedRecords.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Failed Provisioning ({failedRecords.length})
            </CardTitle>
            <CardDescription>
              Records that failed to provision automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background"
                >
                  <div>
                    <p className="font-medium">{record.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      TV:{" "}
                      <span className="font-mono">
                        {record.user.tradingViewUsername || "Not set"}
                      </span>{" "}
                      • {record.strategy.name}
                    </p>
                    {record.failureReason && (
                      <p className="text-sm text-red-600 mt-1">
                        {record.failureReason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Attempts: {record.retryCount} •{" "}
                      Last:{" "}
                      {record.lastAttemptAt
                        ? new Date(record.lastAttemptAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retrying === record.id}
                    onClick={() => handleRetry(record.id)}
                  >
                    {retrying === record.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Records */}
      {pendingRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Provisioning ({pendingRecords.length})
            </CardTitle>
            <CardDescription>
              Records waiting for provisioning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{record.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      TV:{" "}
                      <span className="font-mono">
                        {record.user.tradingViewUsername || "Not set"}
                      </span>{" "}
                      • {record.strategy.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(record.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Issues */}
      {stats.pending === 0 &&
        stats.failed === 0 &&
        manualTasks.length === 0 && (
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800">
                All Systems Operational
              </h3>
              <p className="text-sm text-green-700 mt-1">
                No pending or failed provisioning tasks
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
