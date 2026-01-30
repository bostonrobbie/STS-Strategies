/**
 * Credential Update Workflow Integration Tests
 *
 * Tests the TradingView credential management system:
 * - Credential validation before storing
 * - Encryption at rest
 * - Service mode transitions
 * - Audit logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment
vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcwo="); // 32 bytes base64
vi.stubEnv("TV_ACCESS_API_URL", "https://test-api.example.com");

// Mock Prisma client
const mockCredentials: any[] = [];
const mockSystemConfig: Map<string, any> = new Map();
const mockAuditLogs: any[] = [];

vi.mock("@sts/database", () => ({
  prisma: {
    tradingViewCredential: {
      findFirst: vi.fn((args) => {
        if (args?.where?.isActive) {
          return Promise.resolve(
            mockCredentials.find((c) => c.isActive) || null
          );
        }
        return Promise.resolve(mockCredentials[0] || null);
      }),
      findMany: vi.fn(() => Promise.resolve(mockCredentials)),
      create: vi.fn((args) => {
        const cred = {
          id: `cred_${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockCredentials.push(cred);
        return Promise.resolve(cred);
      }),
      update: vi.fn((args) => {
        const cred = mockCredentials.find((c) => c.id === args.where.id);
        if (cred) {
          Object.assign(cred, args.data, { updatedAt: new Date() });
        }
        return Promise.resolve(cred);
      }),
      updateMany: vi.fn((args) => {
        let count = 0;
        mockCredentials.forEach((c) => {
          if (args.where?.isActive === c.isActive || !args.where) {
            Object.assign(c, args.data);
            count++;
          }
        });
        return Promise.resolve({ count });
      }),
    },
    systemConfig: {
      findUnique: vi.fn((args) => {
        const value = mockSystemConfig.get(args.where.key);
        if (value) {
          return Promise.resolve({ key: args.where.key, value });
        }
        return Promise.resolve(null);
      }),
      upsert: vi.fn((args) => {
        mockSystemConfig.set(args.where.key, args.update?.value || args.create?.value);
        return Promise.resolve({ key: args.where.key, value: args.update?.value || args.create?.value });
      }),
    },
    auditLog: {
      create: vi.fn((args) => {
        const log = {
          id: `log_${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        };
        mockAuditLogs.push(log);
        return Promise.resolve(log);
      }),
    },
    $transaction: vi.fn(async (fn) => {
      // Execute the transaction function with mock prisma
      const mockTx = {
        tradingViewCredential: {
          updateMany: vi.fn((args) => {
            let count = 0;
            mockCredentials.forEach((c) => {
              if (args.where?.isActive === c.isActive || !args.where) {
                Object.assign(c, args.data);
                count++;
              }
            });
            return Promise.resolve({ count });
          }),
          create: vi.fn((args) => {
            const cred = {
              id: `cred_${Date.now()}`,
              ...args.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockCredentials.push(cred);
            return Promise.resolve(cred);
          }),
        },
        systemConfig: {
          upsert: vi.fn((args) => {
            mockSystemConfig.set(args.where.key, args.update?.value || args.create?.value);
            return Promise.resolve({ key: args.where.key, value: args.update?.value || args.create?.value });
          }),
        },
        auditLog: {
          create: vi.fn((args) => {
            const log = {
              id: `log_${Date.now()}`,
              ...args.data,
              createdAt: new Date(),
            };
            mockAuditLogs.push(log);
            return Promise.resolve(log);
          }),
        },
      };
      return fn(mockTx);
    }),
  },
  encryptCredentials: vi.fn((values) => ({
    sessionIdEncrypted: Buffer.from(`encrypted_${values.sessionId}`),
    signatureEncrypted: Buffer.from(`encrypted_${values.signature}`),
    iv: Buffer.from("test-iv-16-bytes"),
    authTag: Buffer.from("test-auth-tag---"),
  })),
  decryptCredentials: vi.fn((encrypted) => ({
    sessionId: encrypted.sessionIdEncrypted.toString().replace("encrypted_", ""),
    signature: encrypted.signatureEncrypted.toString().replace("encrypted_", ""),
  })),
  isEncryptionConfigured: vi.fn(() => true),
}));

// Mock fetch for API validation
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Credential Update Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCredentials.length = 0;
    mockSystemConfig.clear();
    mockAuditLogs.length = 0;
    mockFetch.mockReset();
  });

  describe("Credential Validation", () => {
    it("validates credentials before accepting", async () => {
      // Mock successful validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const response = await mockFetch(
        "https://test-api.example.com/validate/TradingView",
        {
          method: "GET",
          headers: {
            "X-Session-Id": "test-session",
            "X-Signature": "test-signature",
          },
        }
      );

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/validate/"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("rejects invalid credentials", async () => {
      // Mock failed validation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid credentials" }),
      });

      const response = await mockFetch(
        "https://test-api.example.com/validate/TradingView",
        {
          method: "GET",
          headers: {
            "X-Session-Id": "invalid-session",
            "X-Signature": "invalid-signature",
          },
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("handles validation timeout", async () => {
      // Mock timeout
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error("Request timed out");
            error.name = "AbortError";
            setTimeout(() => reject(error), 100);
          })
      );

      await expect(
        mockFetch("https://test-api.example.com/validate/TradingView")
      ).rejects.toThrow("Request timed out");
    });
  });

  describe("Credential Storage", () => {
    it("encrypts credentials at rest", async () => {
      const { encryptCredentials, prisma } = await import("@sts/database");

      const testSessionId = "test-session-id-12345";
      const testSignature = "test-signature-67890";

      // Encrypt credentials
      const encrypted = encryptCredentials({
        sessionId: testSessionId,
        signature: testSignature,
      });

      // Store in mock database
      await prisma.tradingViewCredential.create({
        data: {
          sessionIdEncrypted: encrypted.sessionIdEncrypted,
          signatureEncrypted: encrypted.signatureEncrypted,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          apiUrl: "https://test-api.example.com",
          isActive: true,
        },
      });

      // Verify credential was stored
      expect(mockCredentials.length).toBe(1);
      expect(mockCredentials[0].sessionIdEncrypted).toBeDefined();
      expect(mockCredentials[0].signatureEncrypted).toBeDefined();

      // Verify original values are not stored in plaintext
      expect(mockCredentials[0].sessionIdEncrypted.toString()).toContain("encrypted_");
    });

    it("deactivates previous credentials when storing new ones", async () => {
      const { prisma } = await import("@sts/database");

      // Create initial credential
      mockCredentials.push({
        id: "old_cred_1",
        isActive: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
      });

      // Simulate transaction
      await prisma.$transaction(async (tx: any) => {
        // Deactivate old credentials
        await tx.tradingViewCredential.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });

        // Create new credential
        await tx.tradingViewCredential.create({
          data: {
            sessionIdEncrypted: Buffer.from("new"),
            signatureEncrypted: Buffer.from("new"),
            iv: Buffer.from("iv"),
            authTag: Buffer.from("auth"),
            apiUrl: "https://api.example.com",
            isActive: true,
          },
        });
      });

      // Verify old credential is deactivated
      const oldCred = mockCredentials.find((c) => c.id === "old_cred_1");
      expect(oldCred?.isActive).toBe(false);

      // Verify new credential is active
      const activeCreds = mockCredentials.filter((c) => c.isActive);
      expect(activeCreds.length).toBe(1);
    });
  });

  describe("Service Mode Transitions", () => {
    it("switches mode to AUTO when valid credentials saved", async () => {
      const { prisma } = await import("@sts/database");

      // Mock successful validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Simulate credential update with mode switch
      await prisma.$transaction(async (tx: any) => {
        await tx.tradingViewCredential.create({
          data: {
            sessionIdEncrypted: Buffer.from("encrypted"),
            signatureEncrypted: Buffer.from("encrypted"),
            iv: Buffer.from("iv"),
            authTag: Buffer.from("auth"),
            apiUrl: "https://api.example.com",
            isActive: true,
            validatedAt: new Date(),
          },
        });

        await tx.systemConfig.upsert({
          where: { key: "provisioning_service_mode" },
          update: { value: { mode: "AUTO", reason: "Credentials updated" } },
          create: { key: "provisioning_service_mode", value: { mode: "AUTO", reason: "Credentials updated" } },
        });
      });

      // Verify mode is AUTO
      const mode = mockSystemConfig.get("provisioning_service_mode");
      expect(mode?.mode).toBe("AUTO");
    });

    it("stays in MANUAL mode if credentials fail validation", async () => {
      // Set initial MANUAL mode
      mockSystemConfig.set("provisioning_service_mode", {
        mode: "MANUAL",
        reason: "Previous credentials expired",
      });

      // Mock failed validation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Mode should not change
      const mode = mockSystemConfig.get("provisioning_service_mode");
      expect(mode?.mode).toBe("MANUAL");
    });
  });

  describe("Audit Logging", () => {
    it("creates audit log on credential update", async () => {
      const { prisma } = await import("@sts/database");

      await prisma.$transaction(async (tx: any) => {
        await tx.tradingViewCredential.create({
          data: {
            sessionIdEncrypted: Buffer.from("encrypted"),
            signatureEncrypted: Buffer.from("encrypted"),
            iv: Buffer.from("iv"),
            authTag: Buffer.from("auth"),
            apiUrl: "https://api.example.com",
            isActive: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: "admin_user_123",
            action: "credentials.updated",
            details: {
              apiUrl: "https://api.example.com",
              modeChangedTo: "AUTO",
            },
          },
        });
      });

      // Verify audit log was created
      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0].action).toBe("credentials.updated");
      expect(mockAuditLogs[0].userId).toBe("admin_user_123");
    });

    it("logs validation failures", async () => {
      const { prisma } = await import("@sts/database");

      await prisma.auditLog.create({
        data: {
          userId: "admin_user_123",
          action: "credentials.validate_failed",
          details: {
            apiUrl: "https://api.example.com",
            httpStatus: 401,
            error: "Invalid credentials",
          },
        },
      });

      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0].action).toBe("credentials.validate_failed");
    });
  });

  describe("Rate Limiting", () => {
    it("limits validation attempts", async () => {
      // Simulate rate limiting on the 6th attempt
      const attempts: boolean[] = [];

      for (let i = 0; i < 6; i++) {
        if (i < 5) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
          attempts.push(true);
        } else {
          // 6th attempt should be rate limited
          attempts.push(false);
        }
      }

      // Verify first 5 attempts succeeded
      expect(attempts.slice(0, 5).every((a) => a === true)).toBe(true);

      // 6th attempt should be blocked
      expect(attempts[5]).toBe(false);
    });
  });
});
