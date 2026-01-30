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

export const metadata = {
  title: "Access Management | Admin | STS Strategies",
};

async function getAccessRecords() {
  return prisma.strategyAccess.findMany({
    include: {
      user: {
        select: { email: true, name: true, tradingViewUsername: true },
      },
      strategy: {
        select: { name: true, pineId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

function getStatusBadge(status: string) {
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

export default async function AccessPage() {
  const accessRecords = await getAccessRecords();

  const pending = accessRecords.filter((a) => a.status === "PENDING");
  const failed = accessRecords.filter((a) => a.status === "FAILED");
  const granted = accessRecords.filter((a) => a.status === "GRANTED");
  const revoked = accessRecords.filter((a) => a.status === "REVOKED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Access Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage TradingView strategy access
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {pending.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {failed.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Granted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {granted.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revoked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {revoked.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention */}
      {(pending.length > 0 || failed.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>
              Records that may require manual intervention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...pending, ...failed].map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background"
                >
                  <div>
                    <p className="font-medium">{access.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {access.strategy.name} • TV:{" "}
                      {access.user.tradingViewUsername || "Not set"}
                    </p>
                    {access.failureReason && (
                      <p className="text-sm text-red-600 mt-1">
                        {access.failureReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(access.status)}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/users/${access.userId}`}>Manage</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Access Records */}
      <Card>
        <CardHeader>
          <CardTitle>All Access Records ({accessRecords.length})</CardTitle>
          <CardDescription>
            Complete history of strategy access grants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">TradingView</th>
                  <th className="pb-3 pr-4">Strategy</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Updated</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accessRecords.map((access) => (
                  <tr key={access.id} className="border-b">
                    <td className="py-4 pr-4">
                      <p className="font-medium">
                        {access.user.name || access.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {access.user.email}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-mono text-sm">
                        {access.user.tradingViewUsername || "-"}
                      </span>
                    </td>
                    <td className="py-4 pr-4">{access.strategy.name}</td>
                    <td className="py-4 pr-4">{getStatusBadge(access.status)}</td>
                    <td className="py-4 pr-4 text-sm text-muted-foreground">
                      {new Date(access.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/users/${access.userId}`}>
                          View User
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
