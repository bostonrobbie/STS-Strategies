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
import { StructuredData } from "@/components/structured-data";

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
      <StructuredData type="product" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 lg:py-40">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center animate-in">
            <Badge 
              variant="secondary" 
              className="mb-6 px-4 py-1.5 text-sm font-medium"
            >
              Professional NQ/NASDAQ Strategies
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Add a Systematic Edge to Your Trading
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl md:mt-8">
              Access 6 professional trading strategies built on 15 years of
              historical data. One-time payment. Lifetime access. No recurring
              fees.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center md:mt-12">
              <Button size="lg" className="w-full sm:w-auto group" asChild>
                <Link href="/pricing">
                  Get Lifetime Access
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/strategies">View Strategies</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {formatCurrency(PRICING.LIFETIME_AMOUNT)} one-time payment • All 6 strategies included
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              How It Works
            </h2>
            <p className="mt-4 text-balance text-lg text-muted-foreground">
              Get started in three simple steps. No complex setup, no ongoing fees.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3 md:gap-12">
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Purchase Access</h3>
              <p className="text-balance text-muted-foreground">
                One-time payment for lifetime access to all strategies. No subscriptions.
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Get TradingView Access</h3>
              <p className="text-balance text-muted-foreground">
                We automatically grant you access to all invite-only strategies on TradingView.
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Add to Your Charts</h3>
              <p className="text-balance text-muted-foreground">
                Apply strategies to your charts and follow the signals. You control your trades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Preview */}
      <section className="border-t bg-muted/20 py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Strategy Library
            </h2>
            <p className="mt-4 text-balance text-lg text-muted-foreground">
              Six distinct strategies covering different market conditions and trading sessions.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((strategy) => (
              <Card 
                key={strategy.id} 
                className="group transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-medium">
                      {strategy.style}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      {strategy.timeframe}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">{strategy.name}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {strategy.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-foreground">Session:</span>{" "}
                    <span className="text-muted-foreground">
                      {strategy.sessionFocus || "All Sessions"}
                    </span>
                  </div>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-base group/link" 
                    asChild
                  >
                    <Link href={`/strategies/${strategy.slug}`}>
                      Learn more{" "}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center md:mt-16">
            <Button size="lg" variant="outline" asChild>
              <Link href="/strategies">View All Strategies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16 md:mb-20">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Why Choose STS Strategies
            </h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">15 Years of Data</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  All strategies are backtested on 15 years of historical NQ data with full transparency.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">Systematic Edge</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  Remove emotion from trading. Follow clear, systematic signals based on proven methodology.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">All Sessions Covered</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  Strategies for every trading session - from overnight Globex to US market hours.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">Plug-and-Play</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  Add strategies directly to your TradingView charts. No coding or complex setup required.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">You Control Trades</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  We provide signals and analysis. You decide when and how to trade. Full control stays with you.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 ring-1 ring-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold">Lifetime Access</h3>
                <p className="text-balance text-muted-foreground leading-relaxed">
                  One payment, forever access. No monthly fees, no surprise charges, no upsells.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="border-t bg-muted/20 py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-balance text-lg text-muted-foreground">
              One price. All strategies. Lifetime access.
            </p>
          </div>
          <Card className="mx-auto max-w-lg border-2 shadow-lg">
            <CardHeader className="text-center space-y-6 pb-8">
              <CardTitle className="text-2xl">Lifetime Access</CardTitle>
              <div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold tracking-tight">
                    {formatCurrency(PRICING.LIFETIME_AMOUNT)}
                  </span>
                  <span className="text-lg text-muted-foreground">one-time</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-4">
                {[
                  "All 6 NQ trading strategies",
                  "Automatic TradingView access",
                  "15 years of backtested data",
                  "Lifetime updates included",
                  "Email support",
                  "No recurring fees",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="w-full group" asChild>
                <Link href="/pricing">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                All sales are final. No refunds.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="border-t py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  Is this automated trading or a signal service?
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  Neither. We provide TradingView strategies that display signals on your charts. You maintain full control and manually execute trades based on the signals you see. This is not automated trading or a signal subscription service.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  What do I need to use the strategies?
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  You need a TradingView account (free or paid) and a brokerage account to execute trades. The strategies work on any TradingView plan, but a paid plan is recommended for real-time data.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  How fast do I get access?
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  Access is typically granted within 24 hours of purchase. You'll receive an email with instructions once your TradingView account has been granted access to all strategies.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  Can I cancel and get a refund?
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  All sales are final. Due to the digital nature of the product and immediate access granted, we do not offer refunds. Please review the strategy details and risk disclaimer before purchasing.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/faq">View All FAQs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="border-t bg-muted/20 py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-2xl font-bold">Important Risk Disclosure</h2>
            <p className="text-balance text-sm text-muted-foreground leading-relaxed">
              HYPOTHETICAL PERFORMANCE RESULTS HAVE MANY INHERENT LIMITATIONS. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown. Trading futures involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. The strategies provided are for educational and analytical purposes only and do not constitute investment advice.
            </p>
            <Button variant="link" className="mt-6" asChild>
              <Link href="/risk-disclaimer">Read Full Risk Disclaimer</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t py-24 md:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
              Ready to Add a Systematic Edge?
            </h2>
            <p className="text-balance text-lg text-muted-foreground mb-10">
              Join traders who use data-driven strategies to approach the markets systematically.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto group" asChild>
                <Link href="/pricing">
                  Get Lifetime Access
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/strategies">Explore Strategies</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
