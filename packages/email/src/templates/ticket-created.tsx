import { Button, Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface TicketCreatedEmailProps {
  name?: string;
  ticketId: string;
  subject: string;
  ticketUrl: string;
}

export function TicketCreatedEmail({
  name,
  ticketId,
  subject,
  ticketUrl,
}: TicketCreatedEmailProps) {
  return (
    <EmailLayout preview={`Support Ticket Created: ${subject}`}>
      <Heading style={heading}>Support Ticket Created</Heading>

      <Text style={paragraph}>
        {name ? `Hi ${name},` : "Hi,"} we&apos;ve received your support request
        and created a ticket for you.
      </Text>

      <div style={ticketBox}>
        <Text style={ticketLabel}>Ticket ID</Text>
        <Text style={ticketValue}>{ticketId}</Text>
        <Hr style={divider} />
        <Text style={ticketLabel}>Subject</Text>
        <Text style={ticketValue}>{subject}</Text>
      </div>

      <Text style={paragraph}>
        Our support team will review your request and respond as soon as
        possible. You can expect a response within 24-48 hours during business
        days.
      </Text>

      <Text style={paragraph}>
        You can view and reply to your ticket at any time from your dashboard.
      </Text>

      <Button style={button} href={ticketUrl}>
        View Ticket
      </Button>

      <Text style={note}>
        Please do not reply directly to this email. Use your dashboard to
        communicate with our support team.
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
  margin: "0 0 16px",
};

const ticketBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const ticketLabel = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const ticketValue = {
  fontSize: "16px",
  color: "#1a1a1a",
  margin: "0 0 12px",
  fontWeight: "500",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "16px 0",
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
  margin: "24px 0 0",
  fontStyle: "italic",
};

export default TicketCreatedEmail;
