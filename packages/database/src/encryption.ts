/**
 * AES-256-GCM Encryption Utilities
 *
 * Used for encrypting sensitive credentials at rest in the database.
 * Key is loaded from CREDENTIAL_ENCRYPTION_KEY environment variable.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) base64-encoded
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY environment variable is not set. " +
        "Generate with: openssl rand -base64 32"
    );
  }

  const key = Buffer.from(keyBase64, "base64");

  if (key.length !== 32) {
    throw new Error(
      `Invalid encryption key length: ${key.length} bytes. Expected 32 bytes. ` +
        "Generate with: openssl rand -base64 32"
    );
  }

  return key;
}

export interface EncryptedData {
  encrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Object containing encrypted data, IV, and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { encrypted, iv, authTag };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param encrypted - The encrypted buffer
 * @param iv - The initialization vector used during encryption
 * @param authTag - The authentication tag from encryption
 * @returns The decrypted plaintext string
 */
export function decrypt(
  encrypted: Buffer,
  iv: Buffer,
  authTag: Buffer
): string {
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt multiple values with the same IV (for related credentials)
 *
 * @param values - Object with string values to encrypt
 * @returns Object with encrypted buffers, shared IV, and auth tags
 */
export function encryptCredentials(values: {
  sessionId: string;
  signature: string;
}): {
  sessionIdEncrypted: Buffer;
  signatureEncrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  // Encrypt session ID
  const sessionCipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const sessionIdEncrypted = Buffer.concat([
    sessionCipher.update(values.sessionId, "utf8"),
    sessionCipher.final(),
  ]);
  const sessionAuthTag = sessionCipher.getAuthTag();

  // Encrypt signature with fresh IV (GCM requires unique IV per encryption)
  const sigIv = crypto.randomBytes(IV_LENGTH);
  const sigCipher = crypto.createCipheriv(ALGORITHM, key, sigIv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const signatureEncrypted = Buffer.concat([
    sigCipher.update(values.signature, "utf8"),
    sigCipher.final(),
  ]);
  const sigAuthTag = sigCipher.getAuthTag();

  // Combine auth tags (first 16 bytes for session, next 16 for signature)
  const combinedAuthTag = Buffer.concat([sessionAuthTag, sigAuthTag]);

  // Combine IVs (first 16 bytes for session, next 16 for signature)
  const combinedIv = Buffer.concat([iv, sigIv]);

  return {
    sessionIdEncrypted,
    signatureEncrypted,
    iv: combinedIv,
    authTag: combinedAuthTag,
  };
}

/**
 * Decrypt credential values
 *
 * @param encrypted - Object with encrypted buffers
 * @returns Object with decrypted string values
 */
export function decryptCredentials(encrypted: {
  sessionIdEncrypted: Buffer;
  signatureEncrypted: Buffer;
  iv: Buffer;
  authTag: Buffer;
}): {
  sessionId: string;
  signature: string;
} {
  const key = getEncryptionKey();

  // Extract individual IVs and auth tags
  const sessionIv = encrypted.iv.subarray(0, IV_LENGTH);
  const sigIv = encrypted.iv.subarray(IV_LENGTH, IV_LENGTH * 2);
  const sessionAuthTag = encrypted.authTag.subarray(0, AUTH_TAG_LENGTH);
  const sigAuthTag = encrypted.authTag.subarray(
    AUTH_TAG_LENGTH,
    AUTH_TAG_LENGTH * 2
  );

  // Decrypt session ID
  const sessionDecipher = crypto.createDecipheriv(ALGORITHM, key, sessionIv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  sessionDecipher.setAuthTag(sessionAuthTag);
  const sessionId = Buffer.concat([
    sessionDecipher.update(encrypted.sessionIdEncrypted),
    sessionDecipher.final(),
  ]).toString("utf8");

  // Decrypt signature
  const sigDecipher = crypto.createDecipheriv(ALGORITHM, key, sigIv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  sigDecipher.setAuthTag(sigAuthTag);
  const signature = Buffer.concat([
    sigDecipher.update(encrypted.signatureEncrypted),
    sigDecipher.final(),
  ]).toString("utf8");

  return { sessionId, signature };
}

/**
 * Check if encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.CREDENTIAL_ENCRYPTION_KEY;
}
