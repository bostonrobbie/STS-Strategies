/**
 * TradingView Credential Manager
 *
 * Handles encrypted storage and retrieval of TradingView API credentials.
 * Credentials are stored encrypted at rest in the database.
 */

import { prisma } from "../../lib/prisma.js";
import {
  encryptCredentials,
  decryptCredentials,
  isEncryptionConfigured,
} from "@sts/database";
import type {
  TradingViewCredentials,
  StoredCredential,
  ServiceMode,
} from "./types.js";

const SERVICE_MODE_KEY = "provisioning_service_mode";

/**
 * Get the active TradingView credentials from the database.
 * Falls back to environment variables if no database credentials exist.
 *
 * @returns Decrypted credentials or null if not configured
 */
export async function getActiveCredentials(): Promise<TradingViewCredentials | null> {
  // First, try to get from database
  const dbCredential = await prisma.tradingViewCredential.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (dbCredential) {
    try {
      const decrypted = decryptCredentials({
        sessionIdEncrypted: dbCredential.sessionIdEncrypted,
        signatureEncrypted: dbCredential.signatureEncrypted,
        iv: dbCredential.iv,
        authTag: dbCredential.authTag,
      });

      return {
        sessionId: decrypted.sessionId,
        signature: decrypted.signature,
        apiUrl: dbCredential.apiUrl,
      };
    } catch (error) {
      console.error(
        "[CredentialManager] Failed to decrypt credentials:",
        error
      );
      // Fall through to env var fallback
    }
  }

  // Fallback to environment variables (for migration/backwards compat)
  const envApiUrl = process.env.TV_ACCESS_API_URL;
  const envSessionId = process.env.TV_SESSION_ID;
  const envSignature = process.env.TV_SIGNATURE;

  if (envApiUrl && envSessionId && envSignature) {
    console.log("[CredentialManager] Using environment variable credentials");
    return {
      sessionId: envSessionId,
      signature: envSignature,
      apiUrl: envApiUrl,
    };
  }

  return null;
}

/**
 * Store new credentials in the database (encrypted).
 * Deactivates any existing active credentials.
 *
 * @param credentials - The credentials to store
 * @param createdBy - The admin user ID storing these credentials
 * @returns The stored credential metadata
 */
export async function storeCredentials(
  credentials: TradingViewCredentials,
  createdBy?: string
): Promise<StoredCredential> {
  if (!isEncryptionConfigured()) {
    throw new Error(
      "Encryption key not configured. Set CREDENTIAL_ENCRYPTION_KEY environment variable."
    );
  }

  // Encrypt the credentials
  const encrypted = encryptCredentials({
    sessionId: credentials.sessionId,
    signature: credentials.signature,
  });

  // Deactivate existing credentials and create new ones in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deactivate all existing active credentials
    await tx.tradingViewCredential.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new credential record
    const credential = await tx.tradingViewCredential.create({
      data: {
        sessionIdEncrypted: encrypted.sessionIdEncrypted,
        signatureEncrypted: encrypted.signatureEncrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        apiUrl: credentials.apiUrl,
        isActive: true,
        createdBy,
      },
    });

    return credential;
  });

  return {
    id: result.id,
    apiUrl: result.apiUrl,
    isActive: result.isActive,
    validatedAt: result.validatedAt,
    lastUsedAt: result.lastUsedAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    createdBy: result.createdBy,
  };
}

/**
 * Mark credentials as validated (health check passed).
 *
 * @param credentialId - The credential ID to update
 */
export async function markCredentialsValidated(
  credentialId: string
): Promise<void> {
  await prisma.tradingViewCredential.update({
    where: { id: credentialId },
    data: { validatedAt: new Date() },
  });
}

/**
 * Mark credentials as used (API call made).
 *
 * @param credentialId - The credential ID to update
 */
export async function markCredentialsUsed(credentialId: string): Promise<void> {
  await prisma.tradingViewCredential.update({
    where: { id: credentialId },
    data: { lastUsedAt: new Date() },
  });
}

/**
 * Get the active credential metadata (without decrypting).
 *
 * @returns Credential metadata or null
 */
export async function getActiveCredentialMetadata(): Promise<StoredCredential | null> {
  const credential = await prisma.tradingViewCredential.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!credential) {
    return null;
  }

  return {
    id: credential.id,
    apiUrl: credential.apiUrl,
    isActive: credential.isActive,
    validatedAt: credential.validatedAt,
    lastUsedAt: credential.lastUsedAt,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
    createdBy: credential.createdBy,
  };
}

/**
 * Get all credential records (for audit/history).
 *
 * @param limit - Max records to return
 * @returns List of credential metadata
 */
export async function getCredentialHistory(
  limit = 10
): Promise<StoredCredential[]> {
  const credentials = await prisma.tradingViewCredential.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return credentials.map((c) => ({
    id: c.id,
    apiUrl: c.apiUrl,
    isActive: c.isActive,
    validatedAt: c.validatedAt,
    lastUsedAt: c.lastUsedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    createdBy: c.createdBy,
  }));
}

/**
 * Check if credentials are configured (either in DB or env vars).
 */
export async function hasCredentials(): Promise<boolean> {
  const credentials = await getActiveCredentials();
  return credentials !== null;
}

/**
 * Get the current service mode from SystemConfig.
 */
export async function getServiceMode(): Promise<ServiceMode> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: SERVICE_MODE_KEY },
  });

  if (!config) {
    // Default: AUTO if credentials exist, MANUAL otherwise
    const hasCreds = await hasCredentials();
    return hasCreds ? "AUTO" : "MANUAL";
  }

  return (config.value as { mode: ServiceMode }).mode;
}

/**
 * Set the service mode.
 *
 * @param mode - The new service mode
 * @param reason - Optional reason for the mode change
 */
export async function setServiceMode(
  mode: ServiceMode,
  reason?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.systemConfig.upsert({
      where: { key: SERVICE_MODE_KEY },
      update: {
        value: { mode, reason, changedAt: new Date().toISOString() },
      },
      create: {
        key: SERVICE_MODE_KEY,
        value: { mode, reason, changedAt: new Date().toISOString() },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: "provisioning.mode_changed",
        details: { previousMode: mode, newMode: mode, reason },
      },
    });
  });
}

/**
 * Calculate credential age in hours.
 *
 * @param credential - The credential to check
 * @returns Age in hours or null if no credential
 */
export function getCredentialAgeHours(
  credential: StoredCredential | null
): number | null {
  if (!credential) {
    return null;
  }

  const ageMs = Date.now() - credential.createdAt.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60));
}
