// Provisioning Provider Interface
// Abstraction for different TradingView access provisioning methods

export interface ProvisioningResult {
  success: boolean;
  message: string;
  requiresManualAction?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProvisioningProvider {
  name: string;

  /**
   * Check if the provider is configured and ready to use
   */
  isConfigured(): boolean;

  /**
   * Validate that a TradingView username exists
   */
  validateUsername(username: string): Promise<{
    success: boolean;
    username?: string;
    error?: string;
  }>;

  /**
   * Grant access to a Pine Script for a user
   */
  grantAccess(params: {
    username: string;
    pineId: string;
    duration: string; // "1L" for lifetime
  }): Promise<ProvisioningResult>;

  /**
   * Revoke access to a Pine Script for a user
   */
  revokeAccess(params: {
    username: string;
    pineId: string;
  }): Promise<ProvisioningResult>;
}

export type ProviderMode = 'unofficial-api' | 'playwright' | 'manual';

export interface ProviderConfig {
  mode: ProviderMode;
  fallbackMode?: ProviderMode;
}
