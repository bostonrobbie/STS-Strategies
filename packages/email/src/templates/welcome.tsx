import { Button, Heading, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface WelcomeEmailProps {
  name?: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to STS Strategies">
      <Heading style={heading}>
        Welcome{name ? `, ${name}` : ""} to STS Strategies
      </Heading>

      <Text style={paragraph}>
        Thank you for joining STS Strategies. You now have access to our suite
        of professional NQ/NASDAQ trading strategies built on 15 years of
        historical data.
      </Text>

      <Text style={subheading}>Getting Started</Text>

      <Text style={paragraph}>
        <strong>1. Complete your onboarding</strong>
        <br />
        Make sure you&apos;ve entered your TradingView username so we can
        provision your strategy access.
      </Text>

      <Text style={paragraph}>
        <strong>2. Purchase lifetime access</strong>
        <br />
        Get access to all 6 strategies with a single one-time payment. No
        subscriptions, no recurring fees.
      </Text>

      <Text style={paragraph}>
        <strong>3. Add strategies to your charts</strong>
        <br />
        Once your access is granted, you&apos;ll receive invite-only access to
        add our strategies to your TradingView charts.
      </Text>

      <Button style={button} href={dashboardUrl}>
        Go to Dashboard
      </Button>

      <Text style={paragraph}>
        If you have any questions, our support team is here to help. Simply
        create a support ticket from your dashboard.
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

export default WelcomeEmail;
