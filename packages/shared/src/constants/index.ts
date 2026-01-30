// Pricing configuration
export const PRICING = {
  LIFETIME_AMOUNT: 9900, // $99.00 in cents
  CURRENCY: "usd",
  PRODUCT_NAME: "STS Strategies - Lifetime Access",
  PRODUCT_DESCRIPTION:
    "One-time payment for lifetime access to all 6 NQ trading strategies",
} as const;

// Access status labels
export const ACCESS_STATUS_LABELS = {
  PENDING: "Pending",
  GRANTED: "Active",
  FAILED: "Failed",
  REVOKED: "Revoked",
} as const;

// Ticket status labels
export const TICKET_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_CUSTOMER: "Awaiting Response",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;

// Ticket priority labels
export const TICKET_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

// Ticket categories
export const TICKET_CATEGORIES = [
  { value: "access", label: "Strategy Access" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Support" },
  { value: "other", label: "Other" },
] as const;

// Provisioning settings
export const PROVISIONING = {
  MAX_RETRIES: 5,
  BACKOFF_DELAYS: [
    30 * 1000, // 30 seconds
    2 * 60 * 1000, // 2 minutes
    10 * 60 * 1000, // 10 minutes
    30 * 60 * 1000, // 30 minutes
    60 * 60 * 1000, // 1 hour
  ],
  RATE_LIMIT_PER_MINUTE: 10,
} as const;

// TradingView username constraints
export const TRADINGVIEW = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  USERNAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

// SEO defaults
export const SEO = {
  SITE_NAME: "STS Strategies",
  DEFAULT_TITLE: "STS Strategies - Professional NQ Trading Strategies",
  DEFAULT_DESCRIPTION:
    "Access 6 professional NQ/NASDAQ trading strategies built on 15 years of historical data. One-time payment for lifetime access to systematic trading edge.",
} as const;
