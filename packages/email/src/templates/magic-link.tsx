import { Button, Heading, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface MagicLinkEmailProps {
  url: string;
  expires: string;
}

export function MagicLinkEmail({ url, expires }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Sign in to STS Strategies">
      <Heading style={heading}>Sign in to STS Strategies</Heading>

      <Text style={paragraph}>
        Click the button below to sign in to your account. This link will expire
        in {expires}.
      </Text>

      <Button style={button} href={url}>
        Sign In
      </Button>

      <Text style={paragraph}>
        If you didn&apos;t request this email, you can safely ignore it.
      </Text>

      <Text style={linkText}>
        Or copy and paste this URL into your browser:{" "}
        <Link href={url} style={link}>
          {url}
        </Link>
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

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4b5563",
  margin: "0 0 24px",
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
  margin: "0 0 24px",
};

const linkText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
  wordBreak: "break-all" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

export default MagicLinkEmail;
