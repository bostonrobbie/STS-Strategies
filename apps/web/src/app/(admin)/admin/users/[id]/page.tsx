import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminAccessActions } from "@/components/admin-access-actions";

interface UserPageProps {
  params: { id: string };
}

async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { createdAt: "desc" },
      },
      strategyAccess: {
        include: { strategy: true },
        orderBy: { createdAt: "desc" },
      },
      supportTickets: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

async function getAllStrategies() {
  return prisma.strategy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

function getAccessStatusBadge(status: string) {
  switch (status) {
    case "GRANTED":
      return <Badge className="bg-green-100 text-green-800">Granted</Badge>;
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case "FAILED":
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case "REVOKED":
      return <Badge className="bg-gray-100 text-gray-800">Revoked</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function UserDetailPage({ params }: UserPageProps) {
  const [user, strategies] = await Promise.all([
    getUser(params.id),
    getAllStrategies(),
  ]);

  if (!user) {
    notFound();
  }

  const grantedStrategyIds = user.strategyAccess
    .filter((a) => a.status === "GRANTED")
    .map((a) => a.strategyId);

  const ungrantedStrategies = strategies.filter(
    (s) => !grantedStrategyIds.includes(s.id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="text-sm mb-4">
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground"
          >
            Users
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>{user.email}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {user.name || "No name set"}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
            {user.role}
          </Badge>
        </div>
      </div>

      {/* User Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  TradingView Username
                </p>
                <p className="font-mono">
                  {user.tradingViewUsername || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboarded</p>
                <p>{user.onboarded ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p>{new Date(user.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Verified</p>
                <p>
                  {user.emailVerified
                    ? new Date(user.emailVerified).toLocaleString()
                    : "Not verified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchases</span>
              <span className="font-bold">{user.purchases.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Access</span>
              <span className="font-bold">
                {user.strategyAccess.filter((a) => a.status === "GRANTED").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Support Tickets</span>
              <span className="font-bold">{user.supportTickets.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Access */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Access</CardTitle>
          <CardDescription>
            Manage access to strategies for this user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Access */}
          {user.strategyAccess.length > 0 && (
            <div>
              <h3 className="font-medium mb-4">Current Access</h3>
              <div className="space-y-3">
                {user.strategyAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{access.strategy.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {access.grantedAt
                          ? `Granted ${new Date(access.grantedAt).toLocaleDateString()}`
                          : `Created ${new Date(access.createdAt).toLocaleDateString()}`}
                        {access.failureReason && ` • ${access.failureReason}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getAccessStatusBadge(access.status)}
                      <AdminAccessActions
                        accessId={access.id}
                        status={access.status}
                        userId={user.id}
                        strategyId={access.strategyId}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grant New Access */}
          {ungrantedStrategies.length > 0 && (
            <div>
              <h3 className="font-medium mb-4">Grant New Access</h3>
              <div className="space-y-3">
                {ungrantedStrategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{strategy.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {strategy.market} • {strategy.timeframe}
                      </p>
                    </div>
                    <AdminAccessActions
                      accessId={null}
                      status={null}
                      userId={user.id}
                      strategyId={strategy.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchases */}
      {user.purchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-mono text-sm">{purchase.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(purchase.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${(purchase.amount / 100).toFixed(2)}
                    </p>
                    <Badge
                      className={
                        purchase.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : purchase.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Audit Logs */}
      {user.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
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
