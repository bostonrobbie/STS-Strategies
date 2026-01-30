import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Strategies | Admin | STS Strategies",
};

async function getStrategies() {
  return prisma.strategy.findMany({
    include: {
      _count: {
        select: {
          strategyAccess: true,
        },
      },
      strategyAccess: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategies</h1>
          <p className="text-muted-foreground mt-1">
            Manage your trading strategies
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {strategies.map((strategy) => {
          const grantedCount = strategy.strategyAccess.filter(
            (a) => a.status === "GRANTED"
          ).length;
          const pendingCount = strategy.strategyAccess.filter(
            (a) => a.status === "PENDING"
          ).length;
          const failedCount = strategy.strategyAccess.filter(
            (a) => a.status === "FAILED"
          ).length;

          return (
            <Card key={strategy.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{strategy.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {strategy.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={strategy.isActive ? "default" : "secondary"}>
                      {strategy.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge
                      variant={strategy.autoProvision ? "default" : "outline"}
                    >
                      {strategy.autoProvision ? "Auto-provision" : "Manual"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Strategy Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Pine ID</p>
                        <p className="font-mono">{strategy.pineId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Slug</p>
                        <p className="font-mono">{strategy.slug}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Market</p>
                        <p>{strategy.market}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timeframe</p>
                        <p>{strategy.timeframe}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Style</p>
                        <p className="capitalize">{strategy.style}</p>
                      </div>
                      {strategy.sessionFocus && (
                        <div>
                          <p className="text-muted-foreground">Session</p>
                          <p>{strategy.sessionFocus}</p>
                        </div>
                      )}
                    </div>

                    {strategy.features.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Features
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {strategy.features.slice(0, 4).map((feature, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {strategy.features.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{strategy.features.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Access Stats */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Access Stats</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-3 rounded-lg bg-muted text-center">
                        <p className="text-2xl font-bold">
                          {strategy._count.strategyAccess}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-center">
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {grantedCount}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Granted
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 text-center">
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                          {pendingCount}
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Pending
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-center">
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                          {failedCount}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Failed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">
            Strategy editing is managed through the database seed file. To add
            or modify strategies, update{" "}
            <code className="bg-muted px-1 py-0.5 rounded">
              packages/database/prisma/seed.ts
            </code>{" "}
            and run <code className="bg-muted px-1 py-0.5 rounded">pnpm db:seed</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
