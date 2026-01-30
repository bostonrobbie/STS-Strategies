// TradingView Access Management Service
// Wrapper for the unofficial TradingView Access Management API
// https://github.com/trendoscope-algorithms/Tradingview-Access-Management

import { config } from "../lib/config.js";

export interface TVValidateResponse {
  success: boolean;
  username?: string;
  error?: string;
}

export interface TVAccessResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TVAccessGrant {
  username: string;
  pineId: string;
  duration: string; // "1L" for lifetime
}

class TradingViewService {
  private baseUrl: string;
  private sessionId: string;
  private signature: string;

  constructor() {
    this.baseUrl = config.tradingView.apiUrl;
    this.sessionId = config.tradingView.sessionId;
    this.signature = config.tradingView.signature;
  }

  /**
   * Check if TradingView API is configured
   */
  isConfigured(): boolean {
    return !!(this.baseUrl && this.sessionId && this.signature);
  }

  /**
   * Get authorization headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Session-Id": this.sessionId,
      "X-Signature": this.signature,
    };
  }

  /**
   * Validate a TradingView username exists
   */
  async validateUsername(username: string): Promise<TVValidateResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TradingView API not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/validate/${encodeURIComponent(username)}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Validation failed: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        username: data.username || username,
      };
    } catch (error) {
      console.error("TradingView validate error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Grant access to a Pine Script for a user
   */
  async grantAccess(grant: TVAccessGrant): Promise<TVAccessResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TradingView API not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/access/${encodeURIComponent(grant.username)}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            pine_id: grant.pineId,
            duration: grant.duration,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Grant failed: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || "Access granted",
      };
    } catch (error) {
      console.error("TradingView grant error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Revoke access to a Pine Script for a user
   */
  async revokeAccess(username: string, pineId: string): Promise<TVAccessResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TradingView API not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/access/${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
          body: JSON.stringify({
            pine_id: pineId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Revoke failed: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || "Access revoked",
      };
    } catch (error) {
      console.error("TradingView revoke error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const tradingViewService = new TradingViewService();
