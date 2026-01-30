import { prisma } from "@sts/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Admin Dashboard | STS Strategies",
};

async function getStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast30Days,
    totalPurchases,
    purchasesLast7Days,
    totalRevenue,
    accessStats,
    openTickets,
    strategies,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.purchase.count({
      where: { status: "COMPLETED" },
    }),
    prisma.purchase.count({
      where: {
        status: "COMPLETED",
        purchasedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.purchase.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.strategyAccess.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] },
      },
    }),
    prisma.strategy.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { strategyAccess: true },
        },
      },
    }),
  ]);

  return {
    totalUsers,
    newUsersLast30Days,
    totalPurchases,
    purchasesLast7Days,
    totalRevenue: (totalRevenue._sum.amount || 0) / 100,
    accessStats: accessStats.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      },
      {} as Record<string, number>
    ),
    openTickets,
    strategies,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your STS Strategies business
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats.newUsersLast30Days} last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats.purchasesLast7Days} last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Access Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Access Status Overview</CardTitle>
          <CardDescription>
            Current state of strategy access provisioning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-sm text-green-600 dark:text-green-400">
                Granted
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.accessStats.GRANTED || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Pending
              </p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {stats.accessStats.PENDING || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {stats.accessStats.FAILED || 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Revoked
              </p>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {stats.accessStats.REVOKED || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
          <CardDescription>Access counts per strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{strategy.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {strategy.market} • {strategy.timeframe} • {strategy.style}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {strategy._count.strategyAccess}
                  </p>
                  <p className="text-xs text-muted-foreground">total access</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
