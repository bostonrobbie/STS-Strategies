import { Queue } from "bullmq";
import IORedis from "ioredis";

// Create Redis connection for BullMQ
// BullMQ requires ioredis, not @upstash/redis
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not set, queues will not work");
    return null;
  }
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};

const connection = getRedisConnection();

// Provisioning queue - for granting TradingView access
export const provisioningQueue = connection
  ? new Queue("provisioning", {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 30000, // Start at 30 seconds
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // Keep completed jobs for 7 days
          count: 1000,
        },
        removeOnFail: {
          age: 30 * 24 * 3600, // Keep failed jobs for 30 days
        },
      },
    })
  : null;

// Email queue - for sending transactional emails
export const emailQueue = connection
  ? new Queue("email", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep for 1 day
          count: 500,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed for 7 days
        },
      },
    })
  : null;

// Helper to add jobs safely
export async function addProvisioningJob(
  jobName: string,
  data: {
    userId: string;
    purchaseId: string;
    accessIds: string[];
  }
) {
  if (!provisioningQueue) {
    console.error("Provisioning queue not available");
    return null;
  }
  return provisioningQueue.add(jobName, data);
}

export async function addEmailJob(
  jobName: string,
  data: {
    template: string;
    to: string;
    subject: string;
    data: Record<string, unknown>;
  }
) {
  if (!emailQueue) {
    console.error("Email queue not available");
    return null;
  }
  return emailQueue.add(jobName, data);
}
