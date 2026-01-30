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

interface StrategyPageProps {
  params: { slug: string };
}

async function getStrategy(slug: string) {
  return prisma.strategy.findUnique({
    where: { slug, isActive: true },
  });
}

export async function generateMetadata({ params }: StrategyPageProps) {
  const strategy = await getStrategy(params.slug);

  if (!strategy) {
    return { title: "Strategy Not Found" };
  }

  return {
    title: `${strategy.name} | STS Strategies`,
    description: strategy.description,
  };
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const strategy = await getStrategy(params.slug);

  if (!strategy) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/strategies" className="text-muted-foreground hover:text-foreground">
              Strategies
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium">{strategy.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary" className="text-sm">
                {strategy.style}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {strategy.market}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {strategy.timeframe}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {strategy.name}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {strategy.description}
            </p>
          </div>

          {/* Long Description */}
          {strategy.longDescription && (
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <h2 className="text-2xl font-semibold">Strategy Overview</h2>
              <div className="whitespace-pre-wrap">{strategy.longDescription}</div>
            </div>
          )}

          {/* Features */}
          {strategy.features.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {strategy.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <svg
                      className="mr-3 h-5 w-5 flex-shrink-0 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CFTC Disclaimer */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-800 dark:text-amber-200">
                Important Risk Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 dark:text-amber-100 space-y-4">
              <p>
                <strong>
                  HYPOTHETICAL PERFORMANCE RESULTS HAVE MANY INHERENT LIMITATIONS,
                  SOME OF WHICH ARE DESCRIBED BELOW.
                </strong>
              </p>
              <p>
                NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY
                TO ACHIEVE PROFITS OR LOSSES SIMILAR TO THOSE SHOWN. IN FACT, THERE
                ARE FREQUENTLY SHARP DIFFERENCES BETWEEN HYPOTHETICAL PERFORMANCE
                RESULTS AND THE ACTUAL RESULTS SUBSEQUENTLY ACHIEVED BY ANY
                PARTICULAR TRADING PROGRAM.
              </p>
              <p>
                ONE OF THE LIMITATIONS OF HYPOTHETICAL PERFORMANCE RESULTS IS THAT
                THEY ARE GENERALLY PREPARED WITH THE BENEFIT OF HINDSIGHT. IN
                ADDITION, HYPOTHETICAL TRADING DOES NOT INVOLVE FINANCIAL RISK, AND
                NO HYPOTHETICAL TRADING RECORD CAN COMPLETELY ACCOUNT FOR THE IMPACT
                OF FINANCIAL RISK OF ACTUAL TRADING.
              </p>
              <p>
                FOR EXAMPLE, THE ABILITY TO WITHSTAND LOSSES OR TO ADHERE TO A
                PARTICULAR TRADING PROGRAM IN SPITE OF TRADING LOSSES ARE MATERIAL
                POINTS WHICH CAN ALSO ADVERSELY AFFECT ACTUAL TRADING RESULTS. THERE
                ARE NUMEROUS OTHER FACTORS RELATED TO THE MARKETS IN GENERAL OR TO
                THE IMPLEMENTATION OF ANY SPECIFIC TRADING PROGRAM WHICH CANNOT BE
                FULLY ACCOUNTED FOR IN THE PREPARATION OF HYPOTHETICAL PERFORMANCE
                RESULTS AND ALL WHICH CAN ADVERSELY AFFECT TRADING RESULTS.
              </p>
              <p className="font-medium">
                Trading futures and options involves substantial risk of loss and is
                not suitable for all investors. Past performance is not necessarily
                indicative of future results.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle>Get Access</CardTitle>
                <CardDescription>
                  Lifetime access with a one-time payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold">
                  $99
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}one-time
                  </span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Lifetime access to this strategy
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Instant TradingView delivery
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    All future updates included
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Email support
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg">
                  <Link href="/pricing">Purchase Now</Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  All sales are final. No refunds.
                </p>
              </CardContent>
            </Card>

            {/* Strategy Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strategy Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market</span>
                  <span className="font-medium">{strategy.market}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeframe</span>
                  <span className="font-medium">{strategy.timeframe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Style</span>
                  <span className="font-medium capitalize">{strategy.style}</span>
                </div>
                {strategy.sessionFocus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Focus</span>
                    <span className="font-medium">{strategy.sessionFocus}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Have questions about this strategy?{" "}
                  <Link href="/contact" className="text-primary hover:underline">
                    Contact us
                  </Link>{" "}
                  or check our{" "}
                  <Link href="/faq" className="text-primary hover:underline">
                    FAQ
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
