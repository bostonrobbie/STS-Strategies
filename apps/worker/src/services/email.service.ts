// Email Service for Worker
// Sends transactional emails using Resend

import { Resend } from "resend";
import { config } from "../lib/config.js";

const resend = new Resend(config.email.resendApiKey);

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private from: string;

  constructor() {
    this.from = config.email.from;
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    try {
      await resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      return false;
    }
  }

  async sendAccessGranted(params: {
    to: string;
    userName: string;
    strategyName: string;
    tradingViewUsername: string;
  }): Promise<boolean> {
    const { to, userName, strategyName, tradingViewUsername } = params;

    return this.send({
      to,
      subject: `Access Granted: ${strategyName} - ${config.appName}`,
      text: `
Hi ${userName},

Great news! Your access to ${strategyName} has been granted.

Your TradingView username: ${tradingViewUsername}

How to access your strategy:
1. Log in to TradingView (tradingview.com)
2. Go to the Pine Editor or Indicators tab
3. Search for "${strategyName}" in Invite-Only scripts
4. The strategy should now appear in your available indicators

If you don't see the strategy within 24 hours, please contact our support team.

Dashboard: ${config.appUrl}/dashboard

Best regards,
${config.appName} Team
      `.trim(),
    });
  }

  async sendAccessFailed(params: {
    to: string;
    userName: string;
    strategyName: string;
    reason: string;
  }): Promise<boolean> {
    const { to, userName, strategyName, reason } = params;

    return this.send({
      to,
      subject: `Action Required: ${strategyName} Access - ${config.appName}`,
      text: `
Hi ${userName},

We encountered an issue while granting your access to ${strategyName}.

Reason: ${reason}

What to do next:
1. Please verify your TradingView username is correct in your account settings
2. Make sure your TradingView account exists and is active
3. Our team has been notified and will assist you shortly

If you need immediate help, please open a support ticket.

Dashboard: ${config.appUrl}/dashboard
Support: ${config.appUrl}/dashboard/support/new

We apologize for the inconvenience.

Best regards,
${config.appName} Team
      `.trim(),
    });
  }

  async sendAdminAlert(params: {
    subject: string;
    message: string;
    details?: Record<string, unknown>;
  }): Promise<boolean> {
    const { subject, message, details } = params;

    if (!config.adminEmail) {
      console.warn("Admin email not configured, skipping alert");
      return false;
    }

    return this.send({
      to: config.adminEmail,
      subject: `[Admin Alert] ${subject}`,
      text: `
${message}

${details ? `Details:\n${JSON.stringify(details, null, 2)}` : ""}

---
${config.appName} Worker Alert
      `.trim(),
    });
  }
}

export const emailService = new EmailService();
