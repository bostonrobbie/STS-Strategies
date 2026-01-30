import Link from "next/link";

export const metadata = {
  title: "Risk Disclaimer | STS Strategies",
  description:
    "Important risk disclosure and disclaimers for STS Strategies trading systems. Read before purchasing.",
};

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Risk Disclaimer</h1>
        <p className="lead">
          Please read this risk disclaimer carefully before using STS Strategies
          trading systems.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/20 not-prose my-8">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-4">
            CFTC RULE 4.41 - HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS
          </h2>
          <div className="text-sm text-amber-900 dark:text-amber-100 space-y-4">
            <p>
              HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN INHERENT
              LIMITATIONS. UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS
              DO NOT REPRESENT ACTUAL TRADING.
            </p>
            <p>
              ALSO, SINCE THE TRADES HAVE NOT ACTUALLY BEEN EXECUTED, THE RESULTS
              MAY HAVE UNDER-OR-OVER COMPENSATED FOR THE IMPACT, IF ANY, OF CERTAIN
              MARKET FACTORS, SUCH AS LACK OF LIQUIDITY.
            </p>
            <p>
              SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT
              THAT THEY ARE DESIGNED WITH THE BENEFIT OF HINDSIGHT.
            </p>
            <p className="font-medium">
              NO REPRESENTATION IS BEING MADE THAT ANY ACCOUNT WILL OR IS LIKELY TO
              ACHIEVE PROFITS OR LOSSES SIMILAR TO THOSE SHOWN.
            </p>
          </div>
        </div>

        <h2>General Risk Warning</h2>
        <p>
          Trading futures, options, and other derivatives involves substantial
          risk of loss and is not suitable for all investors. Past performance
          is not necessarily indicative of future results. You should carefully
          consider whether trading is suitable for you in light of your
          circumstances, knowledge, and financial resources.
        </p>

        <h2>No Investment Advice</h2>
        <p>
          The trading strategies provided by STS Strategies are for educational
          and informational purposes only. They do not constitute investment
          advice, financial advice, trading advice, or any other type of advice.
          You should not treat any of our content as such.
        </p>
        <p>
          STS Strategies does not recommend that any particular security,
          portfolio of securities, transaction, or investment strategy is
          suitable for any specific person. You understand that the Creator is
          not advising, and will not advise you personally concerning the
          nature, potential, value, or suitability of any particular security,
          portfolio of securities, transaction, investment strategy, or other
          matter.
        </p>

        <h2>No Account Management</h2>
        <p>
          STS Strategies does not manage trading accounts, execute trades on
          behalf of customers, or provide personalized trading recommendations.
          All trading decisions are made solely by the user.
        </p>

        <h2>Risk of Loss</h2>
        <p>
          You can lose some or all of your initial investment. Do not invest
          money that you cannot afford to lose. Trading foreign exchange on
          margin carries a high level of risk and may not be suitable for all
          investors.
        </p>
        <p>The possibility exists that you could sustain a loss of:</p>
        <ul>
          <li>Some or all of your initial investment</li>
          <li>
            More than your initial investment due to leverage and margin
            requirements
          </li>
        </ul>

        <h2>No Guarantees</h2>
        <p>
          There are no guarantees of profits nor freedom from loss. No system or
          strategy is foolproof. Markets can and do behave unexpectedly. Any
          trading system can experience periods of drawdown, losses, and
          underperformance.
        </p>

        <h2>Technical Risks</h2>
        <p>
          You acknowledge that there are risks associated with using
          Internet-based trading systems including, but not limited to:
        </p>
        <ul>
          <li>Hardware, software, and Internet connection failures</li>
          <li>Communication failures between your systems and our servers</li>
          <li>TradingView platform availability and reliability</li>
          <li>Data feed interruptions or delays</li>
          <li>Broker execution delays or failures</li>
        </ul>

        <h2>Third-Party Services</h2>
        <p>
          Our strategies are delivered through TradingView&apos;s platform. We
          are not responsible for TradingView&apos;s availability,
          functionality, or any issues arising from their service. You must
          comply with TradingView&apos;s terms of service in addition to ours.
        </p>

        <h2>Independent Evaluation</h2>
        <p>
          You should perform your own research and analysis and consult with a
          licensed financial advisor before making any investment decisions. By
          using our services, you acknowledge that you are making your own
          trading decisions based on your own judgment and not relying on STS
          Strategies.
        </p>

        <h2>Acceptance of Risk</h2>
        <p>
          By purchasing and using STS Strategies trading systems, you
          acknowledge that:
        </p>
        <ul>
          <li>
            You have read and understood this risk disclaimer in its entirety
          </li>
          <li>
            You accept all risks associated with trading futures and derivatives
          </li>
          <li>
            You are solely responsible for any trading decisions and their
            outcomes
          </li>
          <li>
            STS Strategies shall not be liable for any losses you may incur
          </li>
          <li>You are using money you can afford to lose</li>
        </ul>

        <hr />

        <p className="text-sm text-muted-foreground">
          If you do not agree with any part of this disclaimer, please do not
          use our services. By using our services, you acknowledge that you have
          read, understood, and agree to be bound by this disclaimer.
        </p>

        <p className="text-sm text-muted-foreground">
          For questions about this disclaimer, please{" "}
          <Link href="/contact" className="underline hover:no-underline">
            contact us
          </Link>
          .
        </p>

        <p className="text-sm text-muted-foreground">
          Last updated: January 2025
        </p>
      </div>
    </div>
  );
}
