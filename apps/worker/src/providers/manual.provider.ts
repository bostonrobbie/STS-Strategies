// Manual Fallback Provider
// Creates manual provisioning tasks for admin to complete
// Used when automated provisioning is unavailable or fails

import { PrismaClient } from "@prisma/client";
import { emailService } from "../services/email.service.js";
import type { ProvisioningProvider, ProvisioningResult } from "./types.js";

const prisma = new PrismaClient();

export interface ManualTask {
  id: string;
  type: "grant" | "revoke";
  username: string;
  pineId: string;
  strategyName?: string;
  userEmail?: string;
  userId?: string;
  createdAt: Date;
  status: "pending" | "completed" | "failed";
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export class ManualProvider implements ProvisioningProvider {
  name = "manual";

  /**
   * Manual provider is always "configured" - it's the fallback
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Manual provider cannot validate usernames automatically
   * Returns success with a note that validation should be done manually
   */
  async validateUsername(
    username: string
  ): Promise<{ success: boolean; username?: string; error?: string }> {
    // We accept the username but note that it needs manual verification
    console.log(`[ManualProvider] Username "${username}" accepted - requires manual verification`);

    return {
      success: true,
      username,
      // Not an error, but a note for the admin
    };
  }

  /**
   * Creates a manual provisioning task and notifies admin
   */
  async grantAccess(params: {
    username: string;
    pineId: string;
    duration: string;
    strategyName?: string;
    userEmail?: string;
    userId?: string;
    strategyAccessId?: string;
  }): Promise<ProvisioningResult> {
    const taskId = `manual_grant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[ManualProvider] Creating manual grant task: ${taskId}`);

    // Store the manual task in SystemConfig for tracking
    await prisma.systemConfig.upsert({
      where: { key: `manual_task:${taskId}` },
      create: {
        key: `manual_task:${taskId}`,
        value: {
          id: taskId,
          type: "grant",
          username: params.username,
          pineId: params.pineId,
          duration: params.duration,
          strategyName: params.strategyName,
          userEmail: params.userEmail,
          userId: params.userId,
          strategyAccessId: params.strategyAccessId,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      },
      update: {
        value: {
          id: taskId,
          type: "grant",
          username: params.username,
          pineId: params.pineId,
          duration: params.duration,
          strategyName: params.strategyName,
          userEmail: params.userEmail,
          userId: params.userId,
          strategyAccessId: params.strategyAccessId,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      },
    });

    // Create audit log
    if (params.userId) {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: "provisioning.manual_task_created",
          details: {
            taskId,
            type: "grant",
            username: params.username,
            pineId: params.pineId,
            strategyName: params.strategyName,
          },
        },
      });
    }

    // Send admin notification
    await emailService.sendAdminAlert({
      subject: "Manual Provisioning Required",
      message: `A manual provisioning task has been created that requires your attention.`,
      details: {
        taskId,
        action: "Grant Access",
        tradingViewUsername: params.username,
        pineId: params.pineId,
        strategyName: params.strategyName || "Unknown",
        userEmail: params.userEmail || "Unknown",
        duration: params.duration,
        instructions: [
          "1. Log into TradingView",
          "2. Navigate to the Pine Script indicator page",
          `3. Grant access to username: ${params.username}`,
          "4. Mark the task as complete in the admin dashboard",
        ].join("\n"),
      },
    });

    return {
      success: true,
      message: `Manual provisioning task created (ID: ${taskId}). Admin has been notified.`,
      requiresManualAction: true,
      metadata: {
        provider: this.name,
        taskId,
        status: "pending",
      },
    };
  }

  /**
   * Creates a manual revocation task and notifies admin
   */
  async revokeAccess(params: {
    username: string;
    pineId: string;
    strategyName?: string;
    userEmail?: string;
    userId?: string;
  }): Promise<ProvisioningResult> {
    const taskId = `manual_revoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[ManualProvider] Creating manual revoke task: ${taskId}`);

    // Store the manual task
    await prisma.systemConfig.upsert({
      where: { key: `manual_task:${taskId}` },
      create: {
        key: `manual_task:${taskId}`,
        value: {
          id: taskId,
          type: "revoke",
          username: params.username,
          pineId: params.pineId,
          strategyName: params.strategyName,
          userEmail: params.userEmail,
          userId: params.userId,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      },
      update: {
        value: {
          id: taskId,
          type: "revoke",
          username: params.username,
          pineId: params.pineId,
          strategyName: params.strategyName,
          userEmail: params.userEmail,
          userId: params.userId,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      },
    });

    // Send admin notification
    await emailService.sendAdminAlert({
      subject: "Manual Access Revocation Required",
      message: `A manual access revocation task has been created.`,
      details: {
        taskId,
        action: "Revoke Access",
        tradingViewUsername: params.username,
        pineId: params.pineId,
        strategyName: params.strategyName || "Unknown",
        userEmail: params.userEmail || "Unknown",
        instructions: [
          "1. Log into TradingView",
          "2. Navigate to the Pine Script indicator page",
          `3. Revoke access from username: ${params.username}`,
          "4. Mark the task as complete in the admin dashboard",
        ].join("\n"),
      },
    });

    return {
      success: true,
      message: `Manual revocation task created (ID: ${taskId}). Admin has been notified.`,
      requiresManualAction: true,
      metadata: {
        provider: this.name,
        taskId,
        status: "pending",
      },
    };
  }

  /**
   * Get all pending manual tasks
   */
  static async getPendingTasks(): Promise<ManualTask[]> {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: "manual_task:" },
      },
    });

    return configs
      .map((c) => c.value as unknown as ManualTask)
      .filter((t) => t.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Mark a manual task as completed
   */
  static async completeTask(
    taskId: string,
    completedBy: string,
    notes?: string
  ): Promise<void> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `manual_task:${taskId}` },
    });

    if (!config) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = config.value as unknown as ManualTask;
    task.status = "completed";
    task.completedAt = new Date();
    task.completedBy = completedBy;
    task.notes = notes;

    await prisma.systemConfig.update({
      where: { key: `manual_task:${taskId}` },
      data: { value: task as unknown as Record<string, unknown> },
    });

    // If we have strategyAccessId, update the access record
    const taskWithAccessId = task as ManualTask & { strategyAccessId?: string };
    if (taskWithAccessId.strategyAccessId) {
      await prisma.strategyAccess.update({
        where: { id: taskWithAccessId.strategyAccessId },
        data: {
          status: task.type === "grant" ? "GRANTED" : "REVOKED",
          grantedAt: task.type === "grant" ? new Date() : undefined,
          revokedAt: task.type === "revoke" ? new Date() : undefined,
          failureReason: null,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: task.userId || null,
        action: `provisioning.manual_task_completed`,
        details: {
          taskId,
          type: task.type,
          username: task.username,
          pineId: task.pineId,
          completedBy,
          notes,
        },
      },
    });
  }

  /**
   * Mark a manual task as failed
   */
  static async failTask(
    taskId: string,
    failedBy: string,
    reason: string
  ): Promise<void> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `manual_task:${taskId}` },
    });

    if (!config) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const task = config.value as unknown as ManualTask;
    task.status = "failed";
    task.completedAt = new Date();
    task.completedBy = failedBy;
    task.notes = reason;

    await prisma.systemConfig.update({
      where: { key: `manual_task:${taskId}` },
      data: { value: task as unknown as Record<string, unknown> },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: task.userId || null,
        action: `provisioning.manual_task_failed`,
        details: {
          taskId,
          type: task.type,
          username: task.username,
          pineId: task.pineId,
          failedBy,
          reason,
        },
      },
    });
  }
}
