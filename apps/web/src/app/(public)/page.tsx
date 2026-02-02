"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, BarChart, Zap, Clock, Shield, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const strategies = [
  {
    name: "NQ Momentum Alpha",
    description:
      "Momentum-based strategy for the first 90 minutes of US market hours (9:30-11:00 ET). Designed to capture directional moves during high-volume periods.",
  },
  {
    name: "NQ Trend Rider",
    description:
      "A trend-following strategy that works across all trading sessions. Designed to capture sustained directional moves with optimized risk management.",
  },
  {
    name: "NQ Breakout Pro",
    description:
      "A breakout strategy focused on pre-market and opening range breakouts. Captures explosive moves as overnight ranges resolve.",
  },
  {
    name: "NQ Mean Reversion",
    description:
      "A mean reversion strategy optimized for the midday session. Capitalizes on overextended moves when markets tend to consolidate.",
  },
  {
    name: "NQ Power Hour",
    description:
      "A momentum strategy designed for the final hour of trading. Captures strong directional moves as institutions close positions.",
  },
  {
    name: "NQ Overnight Edge",
    description:
      "A trend strategy for the Globex session. Captures moves during lower-volume overnight trading with appropriate position sizing.",
  },
];

const features = [
  {
    icon: BarChart,
    title: "15 Years of Data",
    description:
      "All strategies are backtested on 15 years of historical NQ data with full transparency.",
  },
  {
    icon: Zap,
    title: "Systematic Edge",
    description:
      "Remove emotion from trading. Follow clear, systematic signals based on proven methodology.",
  },
  {
    icon: Clock,
    title: "All Sessions Covered",
    description:
      "Strategies for every trading session - from overnight Globex to US market hours.",
  },
  {
    icon: Shield,
    title: "You Control Trades",
    description:
      "We provide signals and analysis. You decide when and how to trade. Full control stays with you.",
  },
  {
    icon: BookOpen,
    title: "Lifetime Access",
    description:
      "One payment, forever access. No monthly fees, no surprise charges, no upsells.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-b from-background to-primary/5">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Data-Driven NQ Trading Strategies
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl mt-4">
                    Six systematic approaches tested on 15 years of historical data. One payment. Yours forever.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-col gap-2 min-[400px]:flex-row"
                >
                  <Link href="/pricing">
                    <Button size="lg">Get Started</Button>
                  </Link>
                  <Link href="#strategy-library">
                    <Button size="lg" variant="outline">
                      Explore Strategies
                    </Button>
                  </Link>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Lifetime Access</CardTitle>
                    <CardDescription>All 6 NQ trading strategies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-4xl font-bold">$99.00</div>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Automatic TradingView access
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        15 years of backtested data
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Lifetime updates included
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        Email support
                      </li>
                    </ul>
                    <Link href="/pricing">
                      <Button className="w-full">Purchase Now</Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  How It Works
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Get Started in Three Simple Steps
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  No complex setup, no ongoing fees. Just data-driven strategies.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1 text-center">
                <div className="text-4xl font-bold text-primary">1</div>
                <h3 className="text-xl font-bold">Choose Your Plan</h3>
                <p className="text-muted-foreground">
                  One payment for lifetime access to all six strategies.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="text-4xl font-bold text-primary">2</div>
                <h3 className="text-xl font-bold">Connect TradingView</h3>
                <p className="text-muted-foreground">
                  We grant access to invite-only strategies on your TradingView account.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="text-4xl font-bold text-primary">3</div>
                <h3 className="text-xl font-bold">Apply and Learn</h3>
                <p className="text-muted-foreground">
                  Add strategies to your charts. Study the signals. Make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Strategy Library Section */}
        <section id="strategy-library" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Strategy Library
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Six Distinct Strategies
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Covering different market conditions and trading sessions.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              {strategies.map((strategy, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{strategy.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{strategy.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Why Choose Us
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  A Transparent, Data-Driven Approach
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We provide the tools and data. You make the decisions.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              {features.map((feature, index) => (
                <div key={index} className="grid gap-1 text-center">
                  <div className="flex justify-center">
                    <feature.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What You Should Know Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Important Information
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  What You Should Know
                </h2>
              </div>
            </div>
            <div className="mx-auto max-w-3xl py-12 text-center">
              <p className="text-muted-foreground md:text-xl/relaxed">
                These strategies are tools for analysis, not guarantees of profit. Trading futures involves substantial risk. Backtest results don&apos;t predict future performance. You make all trading decisions.
              </p>
              <Link href="/risk-disclaimer" className="mt-4 inline-block">
                <Button variant="link">Read Full Risk Disclaimer</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Ready to Add a Systematic Approach?
              </h2>
              <p className="max-w-[600px] md:text-xl/relaxed">
                Join traders who use data-driven strategies to approach the markets systematically.
              </p>
              <Link href="/pricing">
                <Button size="lg" variant="secondary">
                  Get Lifetime Access for $99
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
