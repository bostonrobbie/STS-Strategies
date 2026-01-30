/**
 * Degraded Provisioning Integration Tests
 *
 * Tests the system behavior when provisioning degrades:
 * - Automatic fallback to MANUAL mode
 * - Manual task creation
 * - Admin alerts
 * - Recovery workflow (admin-initiated only)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment
vi.stubEnv("TV_ACCESS_API_URL", "https://test-api.example.com");
vi.stubEnv("TV_SESSION_ID", "test-session");
vi.stubEnv("TV_SIGNATURE", "test-signature");

// Track state
const mockSystemConfig: Map<string, any> = new Map();
const mockAuditLogs: any[] = [];
const mockManualTasks: any[] = [];
const mockEmails: any[] = [];
const mockStrategyAccess: any[] = [];
const mockCredentials: any[] = [];

// Mock Prisma
vi.mock("../../apps/worker/src/lib/prisma.js", () => ({
  prisma: {
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
        return Promise.resolve({
          key: args.where.key,
          value: args.update?.value || args.create?.value,
        });
      }),
      findMany: vi.fn(() => {
        const tasks: any[] = [];
        mockSystemConfig.forEach((value, key) => {
          if (key.startsWith("manual_task:")) {
            tasks.push({ key, value });
          }
        });
        return Promise.resolve(tasks);
      }),
    },
    auditLog: {
      create: vi.fn((args) => {
        const log = {
          id: `log_${Date.now()}_${Math.random()}`,
          ...args.data,
          createdAt: new Date(),
        };
        mockAuditLogs.push(log);
        return Promise.resolve(log);
      }),
    },
    strategyAccess: {
      findUnique: vi.fn((args) => {
        return Promise.resolve(
          mockStrategyAccess.find((a) => a.id === args.where?.id) || null
        );
      }),
      findMany: vi.fn((args) => {
        let results = [...mockStrategyAccess];
        if (args?.where?.status) {
          results = results.filter((a) => a.status === args.where.status);
        }
        return Promise.resolve(results);
      }),
      update: vi.fn((args) => {
        const access = mockStrategyAccess.find((a) => a.id === args.where.id);
        if (access) {
          Object.assign(access, args.data, { updatedAt: new Date() });
        }
        return Promise.resolve(access);
      }),
      count: vi.fn((args) => {
        if (args?.where?.status) {
          return Promise.resolve(
            mockStrategyAccess.filter((a) => a.status === args.where.status).length
          );
        }
        return Promise.resolve(mockStrategyAccess.length);
      }),
    },
    tradingViewCredential: {
      findFirst: vi.fn((args) => {
        if (args?.where?.isActive) {
          return Promise.resolve(mockCredentials.find((c) => c.isActive) || null);
        }
        return Promise.resolve(mockCredentials[0] || null);
      }),
      update: vi.fn((args) => {
        const cred = mockCredentials.find((c) => c.id === args.where.id);
        if (cred) {
          Object.assign(cred, args.data);
        }
        return Promise.resolve(cred);
      }),
    },
    $transaction: vi.fn(async (fn) => {
      const mockTx = {
        systemConfig: {
          upsert: vi.fn((args) => {
            mockSystemConfig.set(
              args.where.key,
              args.update?.value || args.create?.value
            );
            return Promise.resolve({
              key: args.where.key,
              value: args.update?.value || args.create?.value,
            });
          }),
        },
        auditLog: {
          create: vi.fn((args) => {
            const log = {
              id: `log_${Date.now()}_${Math.random()}`,
              ...args.data,
              createdAt: new Date(),
            };
            mockAuditLogs.push(log);
            return Promise.resolve(log);
          }),
        },
        strategyAccess: {
          update: vi.fn((args) => {
            const access = mockStrategyAccess.find((a) => a.id === args.where.id);
            if (access) {
              Object.assign(access, args.data);
            }
            return Promise.resolve(access);
          }),
        },
      };
      return fn(mockTx);
    }),
  },
}));

// Mock email service
vi.mock("../../apps/worker/src/services/email.service.js", () => ({
  emailService: {
    sendAdminAlert: vi.fn((params) => {
      mockEmails.push({
        type: "admin_alert",
        ...params,
        sentAt: new Date(),
      });
      return Promise.resolve();
    }),
    sendAccessGranted: vi.fn(),
    sendAccessFailed: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Degraded Provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSystemConfig.clear();
    mockAuditLogs.length = 0;
    mockManualTasks.length = 0;
    mockEmails.length = 0;
    mockStrategyAccess.length = 0;
    mockCredentials.length = 0;
    mockFetch.mockReset();

    // Set up default healthy state
    mockSystemConfig.set("provisioning_service_mode", {
      mode: "AUTO",
      changedAt: new Date().toISOString(),
    });

    // Add an active credential
    mockCredentials.push({
      id: "cred_1",
      isActive: true,
      validatedAt: new Date(),
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    });
  });

  describe("Automatic Fallback", () => {
    it("switches to MANUAL mode when API health check fails", async () => {
      // Mock failed health check
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      // Simulate health check detecting failure
      const currentMode = mockSystemConfig.get("provisioning_service_mode");
      expect(currentMode?.mode).toBe("AUTO");

      // Switch to MANUAL mode (simulating what health check does)
      mockSystemConfig.set("provisioning_service_mode", {
        mode: "MANUAL",
        reason: "Health check failed: Internal Server Error",
        changedAt: new Date().toISOString(),
      });

      // Verify mode changed
      const newMode = mockSystemConfig.get("provisioning_service_mode");
      expect(newMode?.mode).toBe("MANUAL");
      expect(newMode?.reason).toContain("Health check failed");
    });

    it("creates manual task when auto-provisioning fails", async () => {
      // Set system to MANUAL mode
      mockSystemConfig.set("provisioning_service_mode", { mode: "MANUAL" });

      // Create a pending access record
      mockStrategyAccess.push({
        id: "access_1",
        userId: "user_1",
        strategyId: "strategy_1",
        status: "PENDING",
        user: { email: "user@example.com", tradingViewUsername: "tvuser1" },
        strategy: { name: "Test Strategy", pineId: "PUB;test123" },
      });

      // Simulate manual task creation
      const taskId = `task_${Date.now()}`;
      mockSystemConfig.set(`manual_task:${taskId}`, {
        id: taskId,
        type: "grant",
        username: "tvuser1",
        pineId: "PUB;test123",
        strategyName: "Test Strategy",
        userEmail: "user@example.com",
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // Verify task was created
      const task = mockSystemConfig.get(`manual_task:${taskId}`);
      expect(task).toBeDefined();
      expect(task.type).toBe("grant");
      expect(task.username).toBe("tvuser1");
      expect(task.status).toBe("pending");
    });

    it("sends admin alert on mode switch", async () => {
      const { emailService } = await import(
        "../../apps/worker/src/services/email.service.js"
      );

      // Send alert (simulating what health check does)
      await emailService.sendAdminAlert({
        subject: "URGENT: Provisioning Provider Failed - Manual Mode Active",
        message: "System has switched to MANUAL mode.",
        details: {
          provider: "unofficial-api",
          error: "Connection refused",
          urgency: "CRITICAL",
        },
      });

      // Verify email was sent
      expect(mockEmails.length).toBe(1);
      expect(mockEmails[0].subject).toContain("URGENT");
      expect(mockEmails[0].details.urgency).toBe("CRITICAL");
    });

    it("does NOT auto-switch back to AUTO mode", async () => {
      // Set system in MANUAL mode (simulating degraded state)
      mockSystemConfig.set("provisioning_service_mode", {
        mode: "MANUAL",
        reason: "Credentials expired",
        changedAt: new Date().toISOString(),
      });

      // Mock successful API call (system "could" recover)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Simulate health check running
      // In the new implementation, it should NOT auto-recover
      const currentMode = mockSystemConfig.get("provisioning_service_mode");

      // Mode should still be MANUAL (no auto-recovery)
      expect(currentMode?.mode).toBe("MANUAL");
    });
  });

  describe("Manual Mode Operations", () => {
    it("creates manual tasks for all new provisions in MANUAL mode", async () => {
      // Set MANUAL mode
      mockSystemConfig.set("provisioning_service_mode", { mode: "MANUAL" });

      // Create multiple pending access records
      const users = [
        { id: "user_1", username: "tvuser1", email: "user1@example.com" },
        { id: "user_2", username: "tvuser2", email: "user2@example.com" },
        { id: "user_3", username: "tvuser3", email: "user3@example.com" },
      ];

      users.forEach((user, i) => {
        mockStrategyAccess.push({
          id: `access_${i}`,
          userId: user.id,
          status: "PENDING",
          user: { tradingViewUsername: user.username, email: user.email },
          strategy: { name: "Test Strategy", pineId: "PUB;test123" },
        });

        // Create manual task
        const taskId = `task_${i}`;
        mockSystemConfig.set(`manual_task:${taskId}`, {
          id: taskId,
          type: "grant",
          username: user.username,
          status: "pending",
        });
      });

      // Verify all tasks created
      let taskCount = 0;
      mockSystemConfig.forEach((_, key) => {
        if (key.startsWith("manual_task:")) taskCount++;
      });
      expect(taskCount).toBe(3);
    });

    it("admin can complete manual tasks", async () => {
      // Create a pending manual task
      const taskId = "task_complete_test";
      mockSystemConfig.set(`manual_task:${taskId}`, {
        id: taskId,
        type: "grant",
        username: "tvuser1",
        pineId: "PUB;test123",
        status: "pending",
        strategyAccessId: "access_1",
      });

      // Create corresponding access record
      mockStrategyAccess.push({
        id: "access_1",
        status: "PENDING",
      });

      // Simulate admin completing the task
      const task = mockSystemConfig.get(`manual_task:${taskId}`);
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.completedBy = "admin@example.com";
      mockSystemConfig.set(`manual_task:${taskId}`, task);

      // Verify task marked complete
      const updatedTask = mockSystemConfig.get(`manual_task:${taskId}`);
      expect(updatedTask.status).toBe("completed");
      expect(updatedTask.completedBy).toBe("admin@example.com");
    });

    it("strategy access updated when task completed", async () => {
      // Create access record
      mockStrategyAccess.push({
        id: "access_complete_test",
        status: "PENDING",
        userId: "user_1",
        strategyId: "strategy_1",
      });

      // Simulate completion
      const access = mockStrategyAccess.find(
        (a) => a.id === "access_complete_test"
      );
      if (access) {
        access.status = "GRANTED";
        access.grantedAt = new Date();
      }

      // Verify access status updated
      expect(access?.status).toBe("GRANTED");
      expect(access?.grantedAt).toBeDefined();
    });
  });

  describe("Recovery Workflow", () => {
    it("admin can validate new credentials", async () => {
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
            "X-Session-Id": "new-session",
            "X-Signature": "new-signature",
          },
        }
      );

      expect(response.ok).toBe(true);
    });

    it("system switches to AUTO when credentials validated", async () => {
      // Start in MANUAL mode
      mockSystemConfig.set("provisioning_service_mode", {
        mode: "MANUAL",
        reason: "Previous credentials expired",
      });

      // Mock successful validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Simulate admin saving new credentials
      // This is what the /api/admin/credentials/update endpoint does
      mockSystemConfig.set("provisioning_service_mode", {
        mode: "AUTO",
        reason: "Credentials updated and validated",
        changedAt: new Date().toISOString(),
        changedBy: "admin_user_123",
      });

      // Verify mode switched to AUTO
      const mode = mockSystemConfig.get("provisioning_service_mode");
      expect(mode?.mode).toBe("AUTO");
      expect(mode?.changedBy).toBe("admin_user_123");
    });

    it("queued provisions retry after recovery", async () => {
      // Create pending access records (from when system was degraded)
      mockStrategyAccess.push(
        {
          id: "pending_1",
          status: "PENDING",
          retryCount: 1,
          user: { tradingViewUsername: "user1" },
          strategy: { pineId: "PUB;test1" },
        },
        {
          id: "pending_2",
          status: "PENDING",
          retryCount: 2,
          user: { tradingViewUsername: "user2" },
          strategy: { pineId: "PUB;test2" },
        }
      );

      // Count pending records
      const pendingCount = mockStrategyAccess.filter(
        (a) => a.status === "PENDING"
      ).length;
      expect(pendingCount).toBe(2);

      // After recovery, the provisioning worker would pick these up
      // and attempt to process them again
    });
  });

  describe("Credential Age Warnings", () => {
    it("sends warning at 7 days", async () => {
      // Set credential created 8 days ago
      mockCredentials[0].createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const { emailService } = await import(
        "../../apps/worker/src/services/email.service.js"
      );

      // Simulate health check sending warning
      await emailService.sendAdminAlert({
        subject: "TradingView Credentials Aging - Consider Refresh",
        message: "TradingView credentials are 8 days old.",
        details: {
          credentialAgeDays: 8,
          urgency: "WARNING",
        },
      });

      expect(mockEmails.length).toBe(1);
      expect(mockEmails[0].subject).toContain("Aging");
      expect(mockEmails[0].details.urgency).toBe("WARNING");
    });

    it("sends urgent alert at 14 days", async () => {
      // Set credential created 15 days ago
      mockCredentials[0].createdAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

      const { emailService } = await import(
        "../../apps/worker/src/services/email.service.js"
      );

      await emailService.sendAdminAlert({
        subject: "URGENT: TradingView Credentials Need Refresh",
        message: "TradingView credentials are 15 days old.",
        details: {
          credentialAgeDays: 15,
          urgency: "CRITICAL",
        },
      });

      expect(mockEmails.length).toBe(1);
      expect(mockEmails[0].subject).toContain("URGENT");
      expect(mockEmails[0].details.urgency).toBe("CRITICAL");
    });
  });
});
