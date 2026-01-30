import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Shield,
  TrendingUp,
  Zap,
  CheckCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PRICING } from "@sts/shared";

async function getStrategies() {
  return db.strategy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });
}

export default async function HomePage() {
  const strategies = await getStrategies();

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Professional NQ/NASDAQ Strategies
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Add a Systematic Edge to Your Trading
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Access 6 professional trading strategies built on 15 years of
              historical data. One-time payment. Lifetime access. No recurring
              fees.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  Get Lifetime Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/strategies">View Strategies</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {formatCurrency(PRICING.LIFETIME_AMOUNT)} one-time payment &bull;
              All 6 strategies included
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Get started in three simple steps. No complex setup, no ongoing
              fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Purchase Access</h3>
              <p className="text-muted-foreground">
                One-time payment for lifetime access to all strategies. No
                subscriptions.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get TradingView Access</h3>
              <p className="text-muted-foreground">
                We automatically grant you access to all invite-only strategies
                on TradingView.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Add to Your Charts</h3>
              <p className="text-muted-foreground">
                Apply strategies to your charts and follow the signals. You
                control your trades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Preview */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Strategy Library
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Six distinct strategies covering different market conditions and
              trading sessions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <Card key={strategy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{strategy.style}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {strategy.timeframe}
                    </span>
                  </div>
                  <CardTitle className="mt-2">{strategy.name}</CardTitle>
                  <CardDescription>{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Session:</span>{" "}
                    {strategy.sessionFocus || "All Sessions"}
                  </div>
                  <Button variant="link" className="mt-4 p-0" asChild>
                    <Link href={`/strategies/${strategy.slug}`}>
                      Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link href="/strategies">View All Strategies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose STS Strategies
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="shrink-0">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">15 Years of Data</h3>
                <p className="text-muted-foreground text-sm">
                  All strategies are backtested on 15 years of historical NQ
                  data with full transparency.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Systematic Edge</h3>
                <p className="text-muted-foreground text-sm">
                  Remove emotion from trading. Follow clear, systematic signals
                  based on proven methodology.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">All Sessions Covered</h3>
                <p className="text-muted-foreground text-sm">
                  Strategies for every trading session - from overnight Globex
                  to US market hours.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Plug-and-Play</h3>
                <p className="text-muted-foreground text-sm">
                  Add strategies directly to your TradingView charts. No coding
                  or complex setup required.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">You Control Trades</h3>
                <p className="text-muted-foreground text-sm">
                  We provide signals and analysis. You decide when and how to
                  trade. Full control stays with you.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Lifetime Access</h3>
                <p className="text-muted-foreground text-sm">
                  One payment, forever access. No monthly fees, no surprise
                  charges, no upsells.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mb-8">
              One price. All strategies. Lifetime access.
            </p>
            <Card className="border-2">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Lifetime Access</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold">
                    {formatCurrency(PRICING.LIFETIME_AMOUNT)}
                  </span>
                  <span className="text-muted-foreground ml-2">one-time</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 text-sm">
                  {[
                    "All 6 NQ trading strategies",
                    "Automatic TradingView access",
                    "15 years of backtested data",
                    "Lifetime updates included",
                    "Email support",
                    "No recurring fees",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" size="lg" asChild>
                  <Link href="/pricing">Get Started</Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  All sales are final. No refunds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                Is this automated trading or a signal service?
              </AccordionTrigger>
              <AccordionContent>
                Our strategies are analytical tools that display signals on your
                TradingView charts. They do not execute trades automatically.
                You see the signals and make your own trading decisions. This is
                not a managed account service - you maintain full control over
                your trading.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                What do I need to use the strategies?
              </AccordionTrigger>
              <AccordionContent>
                You need a TradingView account (free tier works) and access to
                NQ/NASDAQ E-mini futures charts. The strategies are added as
                invite-only indicators to your TradingView account. No special
                software or coding skills required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How fast do I get access?</AccordionTrigger>
              <AccordionContent>
                Access is typically granted within minutes of your purchase. You
                will receive an email confirmation once your TradingView access
                has been provisioned. You can monitor the status in real-time
                from your dashboard.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can I cancel and get a refund?</AccordionTrigger>
              <AccordionContent>
                All sales are final. We do not offer refunds under any
                circumstances. This policy is clearly stated before, during, and
                after checkout. We encourage you to review the strategy details
                and FAQ thoroughly before purchasing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/faq">View All FAQs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="py-12 bg-muted/50 border-t">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="font-semibold mb-4">Important Risk Disclosure</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>
                HYPOTHETICAL PERFORMANCE RESULTS HAVE MANY INHERENT LIMITATIONS.
              </strong>{" "}
              No representation is being made that any account will or is likely
              to achieve profits or losses similar to those shown. Trading
              futures involves substantial risk of loss and is not suitable for
              all investors. Past performance is not indicative of future
              results. The strategies provided are for educational and
              analytical purposes only and do not constitute investment advice.
            </p>
            <Button variant="link" asChild className="mt-4">
              <Link href="/disclaimer">Read Full Risk Disclaimer</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Add a Systematic Edge?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join traders who use data-driven strategies to approach the
              markets systematically.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/pricing">
                  Get Lifetime Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/strategies">Explore Strategies</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
