import { Button, Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface AccessGrantedEmailProps {
  name?: string;
  tradingViewUsername: string;
  strategies: Array<{ name: string; slug: string }>;
  dashboardUrl: string;
}

export function AccessGrantedEmail({
  name,
  tradingViewUsername,
  strategies,
  dashboardUrl,
}: AccessGrantedEmailProps) {
  return (
    <EmailLayout preview="Your TradingView access has been granted">
      <Heading style={heading}>Your Access Has Been Granted</Heading>

      <Text style={paragraph}>
        {name ? `Hi ${name},` : "Hi,"} great news! Your TradingView access has
        been successfully provisioned for the username{" "}
        <strong>{tradingViewUsername}</strong>.
      </Text>

      <div style={strategiesBox}>
        <Text style={strategiesTitle}>Strategies You Now Have Access To:</Text>
        <Hr style={divider} />
        {strategies.map((strategy) => (
          <Text key={strategy.slug} style={strategyItem}>
            {strategy.name}
          </Text>
        ))}
      </div>

      <Text style={subheading}>How to Add Strategies to Your Charts</Text>

      <Text style={paragraph}>
        <strong>1. Open TradingView</strong>
        <br />
        Log in to TradingView with the username: {tradingViewUsername}
      </Text>

      <Text style={paragraph}>
        <strong>2. Go to Indicators</strong>
        <br />
        Click on &quot;Indicators&quot; at the top of your chart, then select
        &quot;Invite-only scripts&quot;
      </Text>

      <Text style={paragraph}>
        <strong>3. Add to Chart</strong>
        <br />
        You should see all the STS Strategies listed. Click on any strategy to
        add it to your chart.
      </Text>

      <Text style={paragraph}>
        <strong>4. Configure Settings</strong>
        <br />
        Each strategy has configurable parameters. Use the default settings or
        adjust based on your preferences.
      </Text>

      <Button style={button} href={dashboardUrl}>
        View Your Dashboard
      </Button>

      <Text style={note}>
        <strong>Need Help?</strong> If you don&apos;t see the strategies in your
        TradingView account, please wait a few minutes and refresh. If the issue
        persists, contact our support team from your dashboard.
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

const strategiesBox = {
  backgroundColor: "#ecfdf5",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const strategiesTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#065f46",
  margin: "0 0 8px",
};

const divider = {
  borderColor: "#a7f3d0",
  margin: "16px 0",
};

const strategyItem = {
  fontSize: "15px",
  color: "#047857",
  margin: "0 0 8px",
  paddingLeft: "16px",
  borderLeft: "3px solid #10b981",
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

export default AccessGrantedEmail;
