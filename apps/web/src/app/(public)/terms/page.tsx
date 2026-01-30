import Link from "next/link";

export const metadata = {
  title: "Terms of Service | STS Strategies",
  description:
    "Terms of Service for STS Strategies. Read before using our trading strategy services.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="lead">
          Please read these Terms of Service carefully before using STS
          Strategies.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using STS Strategies (&quot;Service&quot;), you agree
          to be bound by these Terms of Service (&quot;Terms&quot;). If you
          disagree with any part of these terms, you may not access the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          STS Strategies provides trading strategy indicators for use on the
          TradingView platform. These strategies are delivered as invite-only
          Pine Script indicators. Our Service is an educational and analytical
          tool and does not constitute investment advice.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          To use our Service, you must create an account. You are responsible
          for:
        </p>
        <ul>
          <li>Providing accurate account information</li>
          <li>Maintaining the security of your account</li>
          <li>All activities that occur under your account</li>
          <li>Providing a valid TradingView username for strategy delivery</li>
        </ul>
        <p>
          You must notify us immediately of any unauthorized use of your
          account.
        </p>

        <h2>4. Purchases and Payment</h2>
        <h3>4.1 Pricing</h3>
        <p>
          All prices are listed in US Dollars (USD) and are subject to change
          without notice. Prices at the time of purchase will be honored.
        </p>

        <h3>4.2 Payment Processing</h3>
        <p>
          Payments are processed securely through Stripe. By making a purchase,
          you agree to Stripe&apos;s terms of service. We do not store your
          payment information.
        </p>

        <h3>4.3 Delivery</h3>
        <p>
          Strategy access is delivered electronically to your TradingView
          account. Delivery is typically automatic and occurs within minutes of
          purchase confirmation. Manual provisioning may take up to 24 hours in
          some cases.
        </p>

        <h3>4.4 No Refunds</h3>
        <p className="font-semibold">
          ALL SALES ARE FINAL. Due to the digital nature of our products and
          instant delivery, we do not offer refunds under any circumstances.
        </p>
        <p>Before purchasing, please:</p>
        <ul>
          <li>Review all strategy information thoroughly</li>
          <li>Read our FAQ and documentation</li>
          <li>Understand the risks involved in trading</li>
          <li>Verify your TradingView username is correct</li>
        </ul>

        <h2>5. License and Access</h2>
        <h3>5.1 License Grant</h3>
        <p>
          Upon purchase, you are granted a non-exclusive, non-transferable,
          personal license to use the purchased strategy on TradingView for your
          own trading purposes.
        </p>

        <h3>5.2 Restrictions</h3>
        <p>You may NOT:</p>
        <ul>
          <li>Share, distribute, or resell access to the strategies</li>
          <li>
            Attempt to copy, reverse engineer, or extract the strategy code
          </li>
          <li>Use the strategies for any commercial purpose without approval</li>
          <li>Create derivative works based on our strategies</li>
          <li>Transfer your license to another person or TradingView account</li>
        </ul>

        <h3>5.3 Access Revocation</h3>
        <p>
          We reserve the right to revoke access at any time if you violate these
          Terms, engage in fraudulent activity, or misuse the Service.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          All strategies, code, content, and materials on STS Strategies are the
          intellectual property of STS Strategies and are protected by copyright
          and other intellectual property laws. You may not use, copy, or
          distribute any content without our express written permission.
        </p>

        <h2>7. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT
          THAT:
        </p>
        <ul>
          <li>The Service will be uninterrupted or error-free</li>
          <li>The strategies will be profitable</li>
          <li>The strategies will perform as expected in all market conditions</li>
          <li>TradingView will remain available or functional</li>
        </ul>

        <h2>8. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, STS STRATEGIES SHALL NOT BE
          LIABLE FOR ANY:
        </p>
        <ul>
          <li>Trading losses or damages</li>
          <li>Lost profits or revenue</li>
          <li>Indirect, incidental, or consequential damages</li>
          <li>Damages arising from use or inability to use the Service</li>
        </ul>
        <p>
          IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID FOR
          THE SERVICE.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless STS Strategies, its officers,
          directors, employees, and agents from any claims, damages, losses, or
          expenses arising from your use of the Service or violation of these
          Terms.
        </p>

        <h2>10. Third-Party Services</h2>
        <p>
          Our Service relies on TradingView for strategy delivery. We are not
          responsible for TradingView&apos;s availability, changes to their
          platform, or their terms of service. You must maintain an active
          TradingView account to access purchased strategies.
        </p>

        <h2>11. Modifications to Service</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of
          the Service at any time without notice. We may also update strategies
          at our discretion. We are not liable for any modification,
          suspension, or discontinuation of the Service.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We may update these Terms at any time. Continued use of the Service
          after changes constitutes acceptance of the new Terms. We encourage
          you to review these Terms periodically.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the United States, without regard to its conflict of law
          provisions.
        </p>

        <h2>14. Dispute Resolution</h2>
        <p>
          Any disputes arising from these Terms or the Service shall be resolved
          through binding arbitration in accordance with the rules of the
          American Arbitration Association. You waive any right to a jury trial
          or class action.
        </p>

        <h2>15. Severability</h2>
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions shall remain in full force and
          effect.
        </p>

        <h2>16. Contact</h2>
        <p>
          For questions about these Terms, please{" "}
          <Link href="/contact" className="underline hover:no-underline">
            contact us
          </Link>
          .
        </p>

        <hr />

        <p className="text-sm text-muted-foreground">
          Last updated: January 2025
        </p>
      </div>
    </div>
  );
}
