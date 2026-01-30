import { Button, Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface TicketReplyEmailProps {
  name?: string;
  ticketId: string;
  subject: string;
  message: string;
  ticketUrl: string;
}

export function TicketReplyEmail({
  name,
  ticketId,
  subject,
  message,
  ticketUrl,
}: TicketReplyEmailProps) {
  return (
    <EmailLayout preview={`New Reply on Your Support Ticket: ${subject}`}>
      <Heading style={heading}>New Reply on Your Ticket</Heading>

      <Text style={paragraph}>
        {name ? `Hi ${name},` : "Hi,"} our support team has replied to your
        ticket.
      </Text>

      <div style={ticketBox}>
        <Text style={ticketLabel}>Ticket</Text>
        <Text style={ticketSubject}>{subject}</Text>
        <Text style={ticketIdText}>#{ticketId}</Text>
      </div>

      <Hr style={divider} />

      <Text style={messageLabel}>Support Team Response:</Text>
      <div style={messageBox}>
        <Text style={messageText}>{message}</Text>
      </div>

      <Button style={button} href={ticketUrl}>
        View Full Conversation
      </Button>

      <Text style={note}>
        To reply, please use your dashboard. Do not reply directly to this
        email.
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
  padding: "16px",
  margin: "24px 0",
};

const ticketLabel = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const ticketSubject = {
  fontSize: "16px",
  color: "#1a1a1a",
  margin: "0 0 4px",
  fontWeight: "600",
};

const ticketIdText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const messageLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 8px",
  fontWeight: "500",
};

const messageBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px",
  borderLeft: "4px solid #22c55e",
  margin: "0 0 24px",
};

const messageText = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#1a1a1a",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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

export default TicketReplyEmail;
