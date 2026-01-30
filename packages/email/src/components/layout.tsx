import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>STS Strategies</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              STS Strategies - Professional NQ Trading Strategies
            </Text>
            <Text style={footerDisclaimer}>
              Trading futures involves substantial risk of loss and is not
              suitable for all investors. Past performance is not indicative of
              future results.
            </Text>
            <Text style={footerLinks}>
              This email was sent by STS Strategies. If you have questions,
              please contact our support team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "24px 32px",
  borderBottom: "1px solid #e6ebf1",
};

const logo = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1a1a1a",
  margin: "0",
  letterSpacing: "-0.5px",
};

const content = {
  padding: "32px",
};

const footer = {
  padding: "24px 32px",
  borderTop: "1px solid #e6ebf1",
  backgroundColor: "#f9fafb",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 8px",
  fontWeight: "500",
};

const footerDisclaimer = {
  fontSize: "11px",
  color: "#9ca3af",
  margin: "0 0 8px",
  lineHeight: "1.5",
};

const footerLinks = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
