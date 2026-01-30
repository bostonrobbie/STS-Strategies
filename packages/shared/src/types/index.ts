// Re-export Prisma types for convenience
// These will be available after prisma generate

export type {
  User,
  Account,
  Session,
  Strategy,
  Purchase,
  StrategyAccess,
  SupportTicket,
  TicketMessage,
  AuditLog,
  UserRole,
  PurchaseStatus,
  AccessStatus,
  TicketStatus,
  TicketPriority,
} from "@sts/database";

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field?: string;
    reason?: string;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalUsers: number;
  totalPurchases: number;
  totalRevenue: number;
  pendingAccess: number;
  failedAccess: number;
  openTickets: number;
}

export interface UserWithAccess {
  id: string;
  email: string;
  name: string | null;
  tradingViewUsername: string | null;
  onboarded: boolean;
  role: "USER" | "ADMIN";
  createdAt: Date;
  hasPurchased: boolean;
  accessStatus: {
    granted: number;
    pending: number;
    failed: number;
  };
}

// ============================================
// STRATEGY TYPES
// ============================================

export interface StrategyWithAccess {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  market: string;
  timeframe: string;
  style: string;
  sessionFocus: string | null;
  features: string[];
  imageUrl: string | null;
  isActive: boolean;
  // User's access status (if authenticated)
  access?: {
    status: "PENDING" | "GRANTED" | "FAILED" | "REVOKED";
    grantedAt: Date | null;
  } | null;
}

// ============================================
// PROVISIONING TYPES
// ============================================

export interface ProvisioningJobData {
  userId: string;
  purchaseId: string;
  accessIds: string[];
}

export interface TradingViewValidateResponse {
  validUser: boolean;
  verifiedUserName: string;
}

export interface TradingViewAccessResponse {
  pine_id: string;
  username: string;
  hasAccess: boolean;
  noExpiration: boolean;
  currentExpiration: string | null;
}

export interface TradingViewGrantResponse {
  pine_id: string;
  username: string;
  expiration: string;
  status: "Success" | "Failure" | "Not Applied";
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditAction =
  | "user.created"
  | "user.login"
  | "user.onboarded"
  | "user.updated"
  | "checkout.initiated"
  | "purchase.completed"
  | "purchase.failed"
  | "access.pending"
  | "access.granted"
  | "access.failed"
  | "access.revoked"
  | "access.retry"
  | "ticket.created"
  | "ticket.replied"
  | "ticket.status_changed"
  | "admin.strategy_created"
  | "admin.strategy_updated"
  | "admin.manual_grant"
  | "admin.manual_revoke";

export interface AuditLogDetails {
  [key: string]: unknown;
}

// ============================================
// EMAIL TYPES
// ============================================

export interface EmailJobData {
  template: EmailTemplate;
  to: string;
  subject: string;
  data: Record<string, unknown>;
}

export type EmailTemplate =
  | "magic-link"
  | "welcome"
  | "purchase-confirmation"
  | "access-granted"
  | "access-failed"
  | "ticket-created"
  | "ticket-reply"
  | "admin-alert";
