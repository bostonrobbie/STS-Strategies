import { Button, Heading, Hr, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../components/layout";

interface AdminAlertEmailProps {
  alertType:
    | "provision-failed"
    | "manual-provision-required"
    | "new-purchase"
    | "new-ticket";
  title: string;
  details: Record<string, string | number | boolean>;
  actionUrl?: string;
  actionLabel?: string;
}

export function AdminAlertEmail({
  alertType,
  title,
  details,
  actionUrl,
  actionLabel,
}: AdminAlertEmailProps) {
  const alertColors = {
    "provision-failed": {
      bg: "#fef2f2",
      border: "#ef4444",
      label: "#991b1b",
    },
    "manual-provision-required": {
      bg: "#fef3c7",
      border: "#f59e0b",
      label: "#92400e",
    },
    "new-purchase": {
      bg: "#ecfdf5",
      border: "#10b981",
      label: "#065f46",
    },
    "new-ticket": {
      bg: "#eff6ff",
      border: "#3b82f6",
      label: "#1e40af",
    },
  };

  const colors = alertColors[alertType];

  return (
    <EmailLayout preview={`Admin Alert: ${title}`}>
      <Text style={alertBadge}>[ADMIN ALERT]</Text>

      <Heading style={heading}>{title}</Heading>

      <div
        style={{
          ...alertBox,
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
        }}
      >
        <Text style={{ ...alertLabel, color: colors.label }}>
          Alert Type: {alertType.replace("-", " ").toUpperCase()}
        </Text>
      </div>

      <Text style={detailsTitle}>Details</Text>
      <Hr style={divider} />

      <div style={detailsBox}>
        {Object.entries(details).map(([key, value]) => (
          <div key={key} style={detailRow}>
            <Text style={detailKey}>{formatKey(key)}</Text>
            <Text style={detailValue}>
              {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
            </Text>
          </div>
        ))}
      </div>

      {actionUrl && (
        <Button style={button} href={actionUrl}>
          {actionLabel || "View in Admin Panel"}
        </Button>
      )}

      <Text style={note}>
        This is an automated alert from STS Strategies. Please take action if
        required.
      </Text>
    </EmailLayout>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/_/g, " ");
}

const alertBadge = {
  fontSize: "11px",
  fontWeight: "700",
  color: "#dc2626",
  margin: "0 0 8px",
  letterSpacing: "1px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 24px",
};

const alertBox = {
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
  borderLeft: "4px solid",
};

const alertLabel = {
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};

const detailsTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 8px",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "8px 0 16px",
};

const detailsBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
};

const detailRow = {
  marginBottom: "12px",
};

const detailKey = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 2px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const detailValue = {
  fontSize: "15px",
  color: "#1a1a1a",
  margin: "0",
  fontWeight: "500",
  fontFamily: "monospace",
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

export default AdminAlertEmail;
