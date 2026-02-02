import { Resend } from "resend";
import { render } from "@react-email/render";
import {
  WelcomeEmail,
  PurchaseConfirmationEmail,
  AccessGrantedEmail,
  AccessFailedEmail,
  TicketCreatedEmail,
  TicketReplyEmail,
  AdminAlertEmail,
} from "@sts/email";
import { formatCurrency, formatDate, absoluteUrl } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM || "STS Strategies <noreply@example.com>";
const adminEmail = process.env.ADMIN_EMAIL;

export async function sendWelcomeEmail(to: string, name?: string) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Welcome to STS Strategies",
    html: await render(
      WelcomeEmail({
        name,
        dashboardUrl: absoluteUrl("/dashboard"),
      })
    ),
  });
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  data: {
    name?: string;
    amount: number;
    strategiesCount: number;
    purchasedAt: Date;
  }
) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Thank you for your purchase - STS Strategies",
    html: await render(
      PurchaseConfirmationEmail({
        name: data.name,
        amount: formatCurrency(data.amount),
        date: formatDate(data.purchasedAt),
        dashboardUrl: absoluteUrl("/dashboard"),
        strategiesCount: data.strategiesCount,
      })
    ),
  });
}

export async function sendAccessGrantedEmail(
  to: string,
  data: {
    name?: string;
    tradingViewUsername: string;
    strategies: Array<{ name: string; slug: string }>;
  }
) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: "Your TradingView access has been granted",
    html: await render(
      AccessGrantedEmail({
        name: data.name,
        tradingViewUsername: data.tradingViewUsername,
        strategies: data.strategies,
        dashboardUrl: absoluteUrl("/dashboard"),
      })
    ),
  });
}

export async function sendAccessFailedEmail(
  to: string,
  data: {
    name?: string;
    tradingViewUsername: string;
    failedStrategies: Array<{ name: string; reason?: string }>;
  }
) {
  // Send to user
  await resend.emails.send({
    from: fromEmail,
    to,
    subject: "Action Required: TradingView Access Issue",
    html: await render(
      AccessFailedEmail({
        name: data.name,
        tradingViewUsername: data.tradingViewUsername,
        failedStrategies: data.failedStrategies,
        supportUrl: absoluteUrl("/dashboard/support/new"),
      })
    ),
  });

  // Also notify admin
  if (adminEmail) {
    await sendAdminAlert("provision-failed", "TradingView Access Failed", {
      userEmail: to,
      tradingViewUsername: data.tradingViewUsername,
      failedCount: data.failedStrategies.length,
      strategies: data.failedStrategies.map((s) => s.name).join(", "),
    });
  }
}

export async function sendTicketCreatedEmail(
  to: string,
  data: {
    name?: string;
    ticketId: string;
    subject: string;
  }
) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: `Support Ticket Created: ${data.subject}`,
    html: await render(
      TicketCreatedEmail({
        name: data.name,
        ticketId: data.ticketId,
        subject: data.subject,
        ticketUrl: absoluteUrl(`/dashboard/support/${data.ticketId}`),
      })
    ),
  });
}

export async function sendTicketReplyEmail(
  to: string,
  data: {
    name?: string;
    ticketId: string;
    subject: string;
    message: string;
  }
) {
  return resend.emails.send({
    from: fromEmail,
    to,
    subject: `New Reply on Your Support Ticket: ${data.subject}`,
    html: await render(
      TicketReplyEmail({
        name: data.name,
        ticketId: data.ticketId,
        subject: data.subject,
        message: data.message,
        ticketUrl: absoluteUrl(`/dashboard/support/${data.ticketId}`),
      })
    ),
  });
}

export async function sendAdminAlert(
  alertType: "provision-failed" | "manual-provision-required" | "new-purchase" | "new-ticket",
  title: string,
  details: Record<string, string | number | boolean>
) {
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set, skipping admin alert");
    return;
  }

  return resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `[Admin Alert] ${title}`,
    html: await render(
      AdminAlertEmail({
        alertType,
        title,
        details,
        actionUrl: absoluteUrl("/admin"),
        actionLabel: "View in Admin Panel",
      })
    ),
  });
}
