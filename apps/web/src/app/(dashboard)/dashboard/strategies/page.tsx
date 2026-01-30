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
  title: "My Strategies | STS Strategies",
};

async function getUserStrategies(userId: string) {
  return prisma.strategyAccess.findMany({
    where: { userId },
    include: { strategy: true },
    orderBy: { createdAt: "desc" },
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "GRANTED":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          Active
        </Badge>
      );
    case "PENDING":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          Pending
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          Failed
        </Badge>
      );
    case "REVOKED":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
          Revoked
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function StrategiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const strategyAccess = await getUserStrategies(session.user.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Strategies</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your purchased strategies
          </p>
        </div>
        <Button asChild>
          <Link href="/strategies">Browse More</Link>
        </Button>
      </div>

      {strategyAccess.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No strategies yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              You haven&apos;t purchased any strategies yet. Browse our
              collection to find your perfect trading system.
            </p>
            <Button asChild>
              <Link href="/strategies">Browse Strategies</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {strategyAccess.map((access) => (
            <Card key={access.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{access.strategy.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {access.strategy.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(access.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Market</p>
                    <p className="font-medium">{access.strategy.market}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timeframe</p>
                    <p className="font-medium">{access.strategy.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Style</p>
                    <p className="font-medium capitalize">
                      {access.strategy.style}
                    </p>
                  </div>
                  {access.strategy.sessionFocus && (
                    <div>
                      <p className="text-sm text-muted-foreground">Session</p>
                      <p className="font-medium">
                        {access.strategy.sessionFocus}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status-specific content */}
                <div className="mt-4 pt-4 border-t">
                  {access.status === "GRANTED" && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Access granted on{" "}
                        {access.grantedAt
                          ? new Date(access.grantedAt).toLocaleDateString()
                          : "N/A"}
                      </div>
                      <a
                        href="https://www.tradingview.com/chart/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Open TradingView
                      </a>
                    </div>
                  )}

                  {access.status === "PENDING" && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 animate-spin text-yellow-500"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-muted-foreground">
                        Access is being provisioned. This usually takes a few
                        minutes.
                      </span>
                    </div>
                  )}

                  {access.status === "FAILED" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span>
                          There was an issue granting access.{" "}
                          {access.failureReason && `Reason: ${access.failureReason}`}
                        </span>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/support/new">
                          Contact Support
                        </Link>
                      </Button>
                    </div>
                  )}

                  {access.status === "REVOKED" && (
                    <div className="text-sm text-muted-foreground">
                      Access was revoked on{" "}
                      {access.revokedAt
                        ? new Date(access.revokedAt).toLocaleDateString()
                        : "N/A"}
                      . Please contact support if you believe this was an error.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
