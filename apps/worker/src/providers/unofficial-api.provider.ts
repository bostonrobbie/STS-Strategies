// Unofficial API Provider
// Uses the self-hosted TradingView Access Management API
// https://github.com/trendoscope-algorithms/Tradingview-Access-Management

import { config } from "../lib/config.js";
import type { ProvisioningProvider, ProvisioningResult } from "./types.js";

export class UnofficialApiProvider implements ProvisioningProvider {
  name = "unofficial-api";
  private baseUrl: string;
  private sessionId: string;
  private signature: string;

  constructor() {
    this.baseUrl = config.tradingView.apiUrl;
    this.sessionId = config.tradingView.sessionId;
    this.signature = config.tradingView.signature;
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.sessionId && this.signature);
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Session-Id": this.sessionId,
      "X-Signature": this.signature,
    };
  }

  async validateUsername(
    username: string
  ): Promise<{ success: boolean; username?: string; error?: string }> {
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
      console.error("[UnofficialApiProvider] validate error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async grantAccess(params: {
    username: string;
    pineId: string;
    duration: string;
  }): Promise<ProvisioningResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "TradingView API not configured",
        requiresManualAction: true,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/access/${encodeURIComponent(params.username)}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            pine_id: params.pineId,
            duration: params.duration,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          message: `Grant failed: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || "Access granted via API",
        metadata: { provider: this.name },
      };
    } catch (error) {
      console.error("[UnofficialApiProvider] grant error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async revokeAccess(params: {
    username: string;
    pineId: string;
  }): Promise<ProvisioningResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "TradingView API not configured",
        requiresManualAction: true,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/access/${encodeURIComponent(params.username)}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
          body: JSON.stringify({
            pine_id: params.pineId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          message: `Revoke failed: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || "Access revoked via API",
        metadata: { provider: this.name },
      };
    } catch (error) {
      console.error("[UnofficialApiProvider] revoke error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
