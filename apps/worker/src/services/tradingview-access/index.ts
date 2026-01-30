/**
 * TradingView Access Service
 *
 * Clean service boundary for TradingView access management.
 * This module is the single source of truth for all TV operations.
 */

// Main service operations
export {
  validateUsername,
  grantAccess,
  revokeAccess,
  healthCheck,
  getStatus,
  testCredentials,
  switchServiceMode,
} from "./tradingview-access.service.js";

// Credential management (for admin API)
export {
  getActiveCredentials,
  storeCredentials,
  markCredentialsValidated,
  markCredentialsUsed,
  getActiveCredentialMetadata,
  getCredentialHistory,
  hasCredentials,
  getServiceMode,
  setServiceMode,
  getCredentialAgeHours,
} from "./credential-manager.js";

// Types
export type {
  TradingViewCredentials,
  StoredCredential,
  ValidationReason,
  ValidationResult,
  GrantAccessParams,
  RevokeAccessParams,
  AccessResult,
  CredentialHealth,
  ApiHealth,
  HealthRecommendation,
  HealthCheckResult,
  ServiceMode,
  ServiceStatus,
} from "./types.js";
