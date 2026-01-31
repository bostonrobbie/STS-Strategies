const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create strategies
  const strategies = [
    {
      name: "NQ Momentum Alpha",
      slug: "nq-momentum-alpha",
      description:
        "A momentum-based strategy designed for the US market open. Captures explosive moves during the highest volume period of the trading day.",
      longDescription: `NQ Momentum Alpha is built on 15 years of historical data analysis to identify high-probability momentum setups during the US market open.

The strategy focuses on the first two hours of trading (9:30 AM - 11:30 AM ET) when market liquidity and volatility create optimal conditions for momentum trades.

**Methodology:**
- Identifies momentum ignition patterns using volume and price action
- Uses adaptive entry timing based on market volatility
- Employs dynamic stop-losses that adjust to market conditions
- All positions closed by end of session

**Best suited for:** Traders who can monitor the US open session and prefer shorter holding periods with defined risk.`,
      pineId: "PUB;nq_momentum_alpha_001",
      market: "NQ",
      timeframe: "5m",
      style: "momentum",
      sessionFocus: "US Open (9:30-11:30 ET)",
      features: [
        "Optimized for US market open volatility",
        "Average 2-3 trades per session",
        "Dynamic stop-loss management",
        "All trades closed intraday",
        "15 years of backtested data",
      ],
      sortOrder: 1,
    },
    {
      name: "NQ Trend Rider",
      slug: "nq-trend-rider",
      description:
        "A trend-following strategy that works across all trading sessions. Designed to capture sustained directional moves with optimized risk management.",
      longDescription: `NQ Trend Rider is an all-sessions trend-following strategy that identifies and rides established market trends.

Unlike momentum strategies that focus on quick moves, Trend Rider is designed to capture larger directional swings over the course of a trading day.

**Methodology:**
- Multi-timeframe trend analysis for confirmation
- Pullback entry system for better risk/reward
- Trailing stop system that locks in profits
- Works during regular and extended hours

**Best suited for:** Traders who prefer fewer trades with larger potential moves and can trade multiple sessions.`,
      pineId: "PUB;nq_trend_rider_002",
      market: "NQ",
      timeframe: "5m",
      style: "trend",
      sessionFocus: "All Sessions",
      features: [
        "Multi-timeframe trend confirmation",
        "Pullback entry optimization",
        "Adaptive trailing stops",
        "Works in all market sessions",
        "15 years of backtested data",
      ],
      sortOrder: 2,
    },
    {
      name: "NQ Breakout Pro",
      slug: "nq-breakout-pro",
      description:
        "A breakout strategy focused on pre-market and opening range breakouts. Captures explosive moves as overnight ranges resolve.",
      longDescription: `NQ Breakout Pro capitalizes on the resolution of overnight consolidation patterns, targeting breakouts from pre-market ranges.

The strategy is specifically designed for the transition from pre-market to regular trading hours, when institutional order flow often triggers significant moves.

**Methodology:**
- Identifies key pre-market levels and ranges
- Filters breakouts using volume confirmation
- Time-based filters to avoid false breakouts
- Aggressive profit-taking on extended moves

**Best suited for:** Traders who trade the pre-market and opening period, looking for high-probability breakout setups.`,
      pineId: "PUB;nq_breakout_pro_003",
      market: "NQ",
      timeframe: "5m",
      style: "breakout",
      sessionFocus: "Pre-market + Open",
      features: [
        "Pre-market range analysis",
        "Volume-confirmed breakouts",
        "Time-based entry filters",
        "Aggressive profit targets",
        "15 years of backtested data",
      ],
      sortOrder: 3,
    },
    {
      name: "NQ Mean Reversion",
      slug: "nq-mean-reversion",
      description:
        "A mean reversion strategy optimized for the midday session. Capitalizes on overextended moves when markets tend to consolidate.",
      longDescription: `NQ Mean Reversion exploits the tendency for markets to revert to average prices during the lower-volatility midday session.

The strategy identifies overextended price moves and takes positions anticipating a return to equilibrium levels.

**Methodology:**
- Statistical deviation measurement from session averages
- Volume depletion confirmation before entry
- Tight risk management with defined reversal points
- Optimized for 11:30 AM - 2:00 PM ET

**Best suited for:** Traders who prefer counter-trend strategies and can trade during the midday session.`,
      pineId: "PUB;nq_mean_reversion_004",
      market: "NQ",
      timeframe: "5m",
      style: "mean-reversion",
      sessionFocus: "Midday (11:30-2:00 ET)",
      features: [
        "Statistical mean reversion signals",
        "Volume depletion filters",
        "Optimized for low-volatility periods",
        "Defined reversal invalidation",
        "15 years of backtested data",
      ],
      sortOrder: 4,
    },
    {
      name: "NQ Power Hour",
      slug: "nq-power-hour",
      description:
        "A momentum strategy designed for the final hour of trading. Captures strong directional moves as institutions close positions.",
      longDescription: `NQ Power Hour is specifically designed for the last hour of trading (3:00-4:00 PM ET) when institutional traders often make significant moves to adjust positions.

This period frequently sees increased volatility and directional conviction, making it ideal for momentum-based entries.

**Methodology:**
- Identifies late-day momentum shifts
- Volume surge detection for entry timing
- Quick profit-taking before market close
- No overnight position risk

**Best suited for:** Traders who can focus during the final hour and prefer defined trading windows.`,
      pineId: "PUB;nq_power_hour_005",
      market: "NQ",
      timeframe: "5m",
      style: "momentum",
      sessionFocus: "Close (3:00-4:00 ET)",
      features: [
        "Late-day momentum detection",
        "Institutional flow analysis",
        "Quick profit targets",
        "No overnight exposure",
        "15 years of backtested data",
      ],
      sortOrder: 5,
    },
    {
      name: "NQ Overnight Edge",
      slug: "nq-overnight-edge",
      description:
        "A trend strategy for the Globex session. Captures moves during lower-volume overnight trading with appropriate position sizing.",
      longDescription: `NQ Overnight Edge is designed for traders who want to participate in the Globex overnight session when US markets are closed but futures continue trading.

The strategy adapts to the lower liquidity environment with appropriate expectations and position management.

**Methodology:**
- Trend detection optimized for lower-volume environments
- Wider stops to accommodate overnight volatility
- Focuses on major economic event reactions
- All positions closed before US pre-market

**Best suited for:** Traders in different time zones or those who prefer to trade outside regular US hours.`,
      pineId: "PUB;nq_overnight_edge_006",
      market: "NQ",
      timeframe: "5m",
      style: "trend",
      sessionFocus: "Globex Session",
      features: [
        "Globex session optimization",
        "Lower-volume environment adaptation",
        "Economic event reaction capture",
        "Closed before US pre-market",
        "15 years of backtested data",
      ],
      sortOrder: 6,
    },
  ];

  for (const strategy of strategies) {
    await prisma.strategy.upsert({
      where: { slug: strategy.slug },
      update: strategy,
      create: strategy,
    });
    console.log(`Created/updated strategy: ${strategy.name}`);
  }

  // Create system config for pricing
  await prisma.systemConfig.upsert({
    where: { key: "pricing" },
    update: {
      value: {
        amount: 9900, // $99.00
        currency: "usd",
        name: "Lifetime Access",
        description: "One-time payment for lifetime access to all strategies",
      },
    },
    create: {
      key: "pricing",
      value: {
        amount: 9900,
        currency: "usd",
        name: "Lifetime Access",
        description: "One-time payment for lifetime access to all strategies",
      },
    },
  });
  console.log("Created/updated pricing config");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "manus@manus.im";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", onboarded: true },
    create: {
      email: adminEmail,
      role: "ADMIN",
      onboarded: true,
      emailVerified: new Date(),
    },
  });
  console.log(`Created/updated admin user: ${adminEmail}`);

  console.log("Database seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
