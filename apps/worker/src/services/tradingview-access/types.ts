/**
 * TradingView Access Service Types
 *
 * Shared types for the TradingView access management service.
 */

// ============================================
// CREDENTIAL TYPES
// ============================================

export interface TradingViewCredentials {
  sessionId: string;
  signature: string;
  apiUrl: string;
}

export interface StoredCredential {
  id: string;
  apiUrl: string;
  isActive: boolean;
  validatedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// ============================================
// VALIDATION TYPES
// ============================================

export type ValidationReason =
  | "VALID"
  | "INVALID"
  | "SERVICE_DOWN"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "CREDENTIALS_EXPIRED";

export interface ValidationResult {
  valid: boolean;
  reason: ValidationReason;
  username?: string;
  error?: string;
}

// ============================================
// ACCESS OPERATION TYPES
// ============================================

export interface GrantAccessParams {
  scriptId: string;
  username: string;
  duration?: string; // Default: "1L" (lifetime)
}

export interface RevokeAccessParams {
  scriptId: string;
  username: string;
}

export interface AccessResult {
  success: boolean;
  message?: string;
  error?: string;
  requiresManualAction?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// HEALTH CHECK TYPES
// ============================================

export type CredentialHealth = "VALID" | "EXPIRED" | "NOT_CONFIGURED";
export type ApiHealth = "HEALTHY" | "DEGRADED" | "DOWN";
export type HealthRecommendation =
  | "NONE"
  | "REFRESH_SOON"
  | "REFRESH_NOW"
  | "MANUAL_MODE";

export interface HealthCheckResult {
  credentialHealth: CredentialHealth;
  apiHealth: ApiHealth;
  lastValidation: Date | null;
  credentialAgeHours: number | null;
  recommendation: HealthRecommendation;
  error?: string;
}

// ============================================
// SERVICE MODE
// ============================================

export type ServiceMode = "AUTO" | "MANUAL" | "DISABLED";

export interface ServiceStatus {
  mode: ServiceMode;
  hasCredentials: boolean;
  credentialsValid: boolean;
  lastValidatedAt: Date | null;
  credentialAgeHours: number | null;
  apiConfigured: boolean;
}
