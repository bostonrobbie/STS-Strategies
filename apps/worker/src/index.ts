// STS Strategies Worker
// Background job processor for TradingView access provisioning and emails

import { Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { config, validateConfig } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";
import {
  processProvisioningJob,
  ProvisioningJobData,
} from "./processors/provisioning.processor.js";

// Validate configuration on startup
validateConfig();

// Create Redis connection
// Note: Using standard Redis connection for BullMQ
// If using Upstash, you may need to use their REST API or a compatible Redis client
const redisConnection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redisConnection.on("connect", () => {
  console.log("✅ Connected to Redis");
});

// Queue names
const QUEUES = {
  PROVISIONING: "provisioning",
  EMAIL: "email",
} as const;

// Create provisioning worker
const provisioningWorker = new Worker<ProvisioningJobData>(
  QUEUES.PROVISIONING,
  async (job) => {
    return processProvisioningJob(job);
  },
  {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  }
);

// Worker event handlers
provisioningWorker.on("completed", (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

provisioningWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

provisioningWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Queue events for monitoring
const queueEvents = new QueueEvents(QUEUES.PROVISIONING, {
  connection: redisConnection,
});

queueEvents.on("waiting", ({ jobId }) => {
  console.log(`📋 Job ${jobId} is waiting`);
});

queueEvents.on("active", ({ jobId }) => {
  console.log(`⚙️  Job ${jobId} is active`);
});

queueEvents.on("stalled", ({ jobId }) => {
  console.warn(`⚠️  Job ${jobId} has stalled`);
});

// ============================================================================
// Worker Heartbeat
// Writes lastSeen timestamp to database every 60 seconds for health monitoring
// ============================================================================
const HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds
const workerId = `worker-${process.pid}-${Date.now()}`;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat(): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: "worker_heartbeat" },
      update: {
        value: {
          lastSeen: new Date().toISOString(),
          workerId,
          uptime: Math.floor(process.uptime()),
          memoryUsageMB: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
      create: {
        key: "worker_heartbeat",
        value: {
          lastSeen: new Date().toISOString(),
          workerId,
          uptime: Math.floor(process.uptime()),
          memoryUsageMB: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
    });
  } catch (error) {
    console.error("[Heartbeat] Failed to update:", error);
  }
}

// Start heartbeat
heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
// Send initial heartbeat immediately
sendHeartbeat().catch(console.error);
console.log(`💓 Heartbeat started (interval: ${HEARTBEAT_INTERVAL_MS / 1000}s, workerId: ${workerId})`);

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log("\n🛑 Shutting down worker...");

  // Stop heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("💔 Heartbeat stopped");
  }

  await provisioningWorker.close();
  await queueEvents.close();
  await redisConnection.quit();
  await prisma.$disconnect();

  console.log("👋 Worker shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Startup message
console.log(`
╔═══════════════════════════════════════════════════════╗
║           STS Strategies Worker Started               ║
╠═══════════════════════════════════════════════════════╣
║  Queues:                                              ║
║    - provisioning (TradingView access)                ║
║                                                       ║
║  Concurrency: ${String(config.worker.concurrency).padEnd(38)}║
║  Max Retries: ${String(config.worker.maxRetries).padEnd(38)}║
╚═══════════════════════════════════════════════════════╝
`);
