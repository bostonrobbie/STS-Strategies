import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface AccessFailedEmailProps {
  name?: string;
  tradingViewUsername: string;
  failedStrategies: Array<{ name: string; reason?: string }>;
  supportUrl: string;
}

export function AccessFailedEmail({
  name,
  tradingViewUsername,
  failedStrategies,
  supportUrl,
}: AccessFailedEmailProps) {
  return (
    <EmailLayout preview="Action Required: TradingView Access Issue">
      <Heading style={heading}>Access Provisioning Issue</Heading>

      <Text style={paragraph}>
        {name ? `Hi ${name},` : "Hi,"} we encountered an issue while
        provisioning your TradingView access for the username{" "}
        <strong>{tradingViewUsername}</strong>.
      </Text>

      <div style={errorBox}>
        <Text style={errorTitle}>Strategies Affected:</Text>
        {failedStrategies.map((strategy, index) => (
          <Text key={index} style={errorItem}>
            {strategy.name}
            {strategy.reason && (
              <span style={errorReason}> - {strategy.reason}</span>
            )}
          </Text>
        ))}
      </div>

      <Text style={subheading}>Common Causes</Text>

      <Text style={paragraph}>
        <strong>Incorrect Username:</strong> Double-check that your TradingView
        username is spelled correctly. Usernames are case-sensitive.
      </Text>

      <Text style={paragraph}>
        <strong>Account Privacy Settings:</strong> Your TradingView account
        privacy settings may be preventing us from adding you. Try making your
        profile visible temporarily.
      </Text>

      <Text style={paragraph}>
        <strong>Temporary TradingView Issue:</strong> Sometimes TradingView
        experiences temporary issues. We will automatically retry provisioning
        your access.
      </Text>

      <Text style={subheading}>What To Do</Text>

      <Text style={paragraph}>
        Our support team has been notified and will investigate this issue. If
        you believe your TradingView username might be incorrect, please update
        it in your account settings.
      </Text>

      <Text style={paragraph}>
        If the issue persists, please create a support ticket and we&apos;ll
        help resolve it as quickly as possible.
      </Text>

      <Button style={button} href={supportUrl}>
        Contact Support
      </Button>

      <Text style={note}>
        <strong>Don&apos;t worry!</strong> Your purchase is secure and we will
        ensure you receive access to all strategies. Our team typically resolves
        these issues within 24 hours.
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 24px",
};

const subheading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "24px 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "0 0 16px",
};

const errorBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #ef4444",
};

const errorTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#991b1b",
  margin: "0 0 12px",
};

const errorItem = {
  fontSize: "15px",
  color: "#b91c1c",
  margin: "0 0 8px",
};

const errorReason = {
  color: "#6b7280",
  fontStyle: "italic",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};

const note = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#6b7280",
  backgroundColor: "#f3f4f6",
  padding: "16px",
  borderRadius: "8px",
  margin: "24px 0 0",
};

export default AccessFailedEmail;
