import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
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
  title: "Dashboard | STS Strategies",
};

async function getDashboardData(userId: string) {
  const [user, strategyAccess, openTickets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        tradingViewUsername: true,
        onboarded: true,
      },
    }),
    prisma.strategyAccess.findMany({
      where: { userId },
      include: { strategy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.count({
      where: {
        userId,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] },
      },
    }),
  ]);

  return { user, strategyAccess, openTickets };
}

function getStatusColor(status: string) {
  switch (status) {
    case "GRANTED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "REVOKED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    default:
      return "";
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { user, strategyAccess, openTickets } = await getDashboardData(
    session.user.id
  );

  const grantedCount = strategyAccess.filter((a) => a.status === "GRANTED").length;
  const pendingCount = strategyAccess.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session.user.name || "Trader"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your strategies and account settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{grantedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>TradingView</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">
              {user?.tradingViewUsername || "Not set"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Access */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Strategies</CardTitle>
              <CardDescription>
                Strategies you have purchased and their access status
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/pricing">Get More Strategies</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {strategyAccess.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t purchased any strategies yet.
              </p>
              <Button asChild>
                <Link href="/strategies">Browse Strategies</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {strategyAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <h3 className="font-medium">{access.strategy.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {access.strategy.market} • {access.strategy.timeframe}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(access.status)}>
                      {access.status}
                    </Badge>
                    {access.status === "GRANTED" && access.grantedAt && (
                      <span className="text-sm text-muted-foreground">
                        Granted{" "}
                        {new Date(access.grantedAt).toLocaleDateString()}
                      </span>
                    )}
                    {access.status === "FAILED" && (
                      <Link
                        href="/dashboard/support/new"
                        className="text-sm text-primary hover:underline"
                      >
                        Get Help
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Having issues with your strategies or account?
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/support/new">Create Support Ticket</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Update your TradingView username or profile
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/settings">Manage Settings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Browse Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Explore more NQ/NASDAQ trading strategies
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/strategies">View All Strategies</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
