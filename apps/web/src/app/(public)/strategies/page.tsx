import Link from "next/link";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Trading Strategies | STS Strategies",
  description:
    "Explore our collection of professional NQ/NASDAQ trading strategies for TradingView. Momentum, trend-following, breakout, and mean-reversion systems for 5-minute intraday trading.",
};

async function getStrategies() {
  return prisma.strategy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Trading Strategies
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Professional NQ/NASDAQ trading strategies built for TradingView.
          Each strategy is designed for 5-minute intraday trading with clear
          entry and exit rules.
        </p>
      </div>

      {/* Strategy Grid */}
      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">{strategy.name}</CardTitle>
                <Badge variant="secondary">{strategy.style}</Badge>
              </div>
              <CardDescription className="mt-2">
                {strategy.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Market</span>
                  <span className="font-medium">{strategy.market}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Timeframe</span>
                  <span className="font-medium">{strategy.timeframe}</span>
                </div>
                {strategy.sessionFocus && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Session</span>
                    <span className="font-medium">{strategy.sessionFocus}</span>
                  </div>
                )}
              </div>

              {/* Features Preview */}
              {strategy.features.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Key Features</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {strategy.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <span className="mr-2 text-primary">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/strategies/${strategy.slug}`}>
                  View Details
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Risk Disclaimer */}
      <div className="mt-16 rounded-lg bg-muted/50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Risk Disclosure
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Trading futures involves substantial risk of loss and is not suitable
          for all investors. Past performance is not indicative of future
          results. These strategies are educational tools and do not constitute
          investment advice.{" "}
          <Link href="/disclaimer" className="underline hover:text-foreground">
            Read full disclaimer
          </Link>
        </p>
      </div>
    </div>
  );
}
