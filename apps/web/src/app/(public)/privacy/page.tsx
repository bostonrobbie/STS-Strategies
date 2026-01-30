import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | STS Strategies",
  description:
    "Privacy Policy for STS Strategies. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="lead">
          This Privacy Policy describes how STS Strategies collects, uses, and
          shares your personal information.
        </p>

        <h2>1. Information We Collect</h2>

        <h3>1.1 Information You Provide</h3>
        <p>We collect information you provide directly to us, including:</p>
        <ul>
          <li>
            <strong>Account Information:</strong> Email address, name, and
            password when you create an account
          </li>
          <li>
            <strong>TradingView Username:</strong> Required for strategy
            delivery
          </li>
          <li>
            <strong>Payment Information:</strong> Processed securely through
            Stripe; we do not store your credit card details
          </li>
          <li>
            <strong>Communications:</strong> Messages sent through our contact
            form or support system
          </li>
        </ul>

        <h3>1.2 Information Collected Automatically</h3>
        <p>
          When you access our Service, we automatically collect certain
          information:
        </p>
        <ul>
          <li>
            <strong>Log Data:</strong> IP address, browser type, device
            information, pages visited, and timestamps
          </li>
          <li>
            <strong>Cookies:</strong> We use cookies for authentication and
            session management
          </li>
          <li>
            <strong>Analytics:</strong> Anonymous usage data to improve our
            Service
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our Service</li>
          <li>Process transactions and deliver purchased strategies</li>
          <li>Send transactional emails (purchase confirmations, access grants)</li>
          <li>Respond to your comments, questions, and support requests</li>
          <li>Monitor and analyze usage trends</li>
          <li>Detect, investigate, and prevent fraudulent activity</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>We do not sell your personal information. We may share information:</p>

        <h3>3.1 Service Providers</h3>
        <p>We share information with third-party service providers who help us operate our Service:</p>
        <ul>
          <li>
            <strong>Stripe:</strong> Payment processing
          </li>
          <li>
            <strong>Resend:</strong> Email delivery
          </li>
          <li>
            <strong>Vercel:</strong> Hosting and infrastructure
          </li>
          <li>
            <strong>TradingView:</strong> Strategy delivery (username only)
          </li>
        </ul>

        <h3>3.2 Legal Requirements</h3>
        <p>
          We may disclose information if required by law, subpoena, or other
          legal process, or to protect our rights, privacy, safety, or property.
        </p>

        <h3>3.3 Business Transfers</h3>
        <p>
          In connection with a merger, acquisition, or sale of assets, your
          information may be transferred as part of that transaction.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as
          needed to provide the Service. We may retain certain information for
          legal, accounting, or business purposes even after account deletion.
        </p>

        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your information, including:
        </p>
        <ul>
          <li>Encryption of data in transit (HTTPS)</li>
          <li>Secure authentication systems</li>
          <li>Regular security assessments</li>
          <li>Limited access to personal information</li>
        </ul>
        <p>
          However, no method of transmission or storage is 100% secure. We
          cannot guarantee absolute security.
        </p>

        <h2>6. Your Rights and Choices</h2>

        <h3>6.1 Account Information</h3>
        <p>
          You can update your account information through your dashboard
          settings.
        </p>

        <h3>6.2 Cookies</h3>
        <p>
          Most browsers allow you to control cookies through settings. Blocking
          cookies may affect the functionality of our Service.
        </p>

        <h3>6.3 Marketing Communications</h3>
        <p>
          You can opt out of marketing emails by clicking &quot;unsubscribe&quot; in any
          email. Note that you will still receive transactional emails related
          to your purchases.
        </p>

        <h3>6.4 Data Access and Deletion</h3>
        <p>
          You may request access to or deletion of your personal information by
          contacting us. Note that we may retain certain information as required
          by law or for legitimate business purposes.
        </p>

        <h2>7. Children&apos;s Privacy</h2>
        <p>
          Our Service is not directed to children under 18. We do not knowingly
          collect personal information from children. If you believe we have
          collected information from a child, please contact us.
        </p>

        <h2>8. International Users</h2>
        <p>
          Our Service is operated in the United States. If you access the
          Service from outside the US, your information will be transferred to
          and processed in the US, which may have different data protection laws
          than your country.
        </p>

        <h2>9. California Privacy Rights</h2>
        <p>
          California residents have additional rights under the CCPA, including
          the right to:
        </p>
        <ul>
          <li>Know what personal information we collect</li>
          <li>Request deletion of personal information</li>
          <li>Opt out of sale of personal information (we do not sell data)</li>
          <li>Non-discrimination for exercising privacy rights</li>
        </ul>

        <h2>10. European Privacy Rights (GDPR)</h2>
        <p>
          If you are in the European Economic Area, you have rights including:
        </p>
        <ul>
          <li>Access to your personal data</li>
          <li>Rectification of inaccurate data</li>
          <li>Erasure of your data</li>
          <li>Restriction of processing</li>
          <li>Data portability</li>
          <li>Objection to processing</li>
        </ul>
        <p>
          To exercise these rights, please contact us. Note that certain data
          may be necessary to provide the Service.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by posting a notice on our website or
          sending an email. Your continued use of the Service after changes
          constitutes acceptance of the updated policy.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          For questions about this Privacy Policy or our privacy practices,
          please{" "}
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
