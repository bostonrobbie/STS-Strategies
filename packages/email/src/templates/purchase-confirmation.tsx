import { Button, Heading, Hr, Row, Column, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface PurchaseConfirmationEmailProps {
  name?: string;
  amount: string;
  date: string;
  dashboardUrl: string;
  strategiesCount: number;
}

export function PurchaseConfirmationEmail({
  name,
  amount,
  date,
  dashboardUrl,
  strategiesCount,
}: PurchaseConfirmationEmailProps) {
  return (
    <EmailLayout preview="Thank you for your purchase - STS Strategies">
      <Heading style={heading}>Thank You for Your Purchase</Heading>

      <Text style={paragraph}>
        {name ? `Hi ${name},` : "Hi,"} thank you for purchasing lifetime access
        to STS Strategies. Your payment has been confirmed.
      </Text>

      <div style={orderBox}>
        <Text style={orderTitle}>Order Details</Text>
        <Hr style={divider} />
        <Row>
          <Column>
            <Text style={orderLabel}>Product</Text>
            <Text style={orderValue}>
              Lifetime Access ({strategiesCount} Strategies)
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={orderLabel}>Amount Paid</Text>
            <Text style={orderValue}>{amount}</Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text style={orderLabel}>Date</Text>
            <Text style={orderValue}>{date}</Text>
          </Column>
        </Row>
      </div>

      <Text style={subheading}>What Happens Next?</Text>

      <Text style={paragraph}>
        <strong>1. Access Provisioning</strong>
        <br />
        We are now provisioning your access to all {strategiesCount} strategies
        on TradingView. This process is automated and typically completes within
        a few minutes.
      </Text>

      <Text style={paragraph}>
        <strong>2. Confirmation Email</strong>
        <br />
        You&apos;ll receive another email once your TradingView access has been
        granted with instructions on how to add the strategies to your charts.
      </Text>

      <Text style={paragraph}>
        <strong>3. Check Your Dashboard</strong>
        <br />
        You can monitor the status of your access provisioning in real-time from
        your dashboard.
      </Text>

      <Button style={button} href={dashboardUrl}>
        View Access Status
      </Button>

      <Text style={note}>
        <strong>Important:</strong> Please note that all sales are final. We do
        not offer refunds as stated in our terms of service. If you have any
        issues with your access, please contact our support team.
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

const orderBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const orderTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 8px",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
};

const orderLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 4px",
};

const orderValue = {
  fontSize: "16px",
  color: "#1a1a1a",
  margin: "0 0 12px",
  fontWeight: "500",
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
  backgroundColor: "#fef3c7",
  padding: "16px",
  borderRadius: "8px",
  margin: "24px 0 0",
};

export default PurchaseConfirmationEmail;
