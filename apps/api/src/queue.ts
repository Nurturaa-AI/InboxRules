// src/queue.ts
// Defines the BullMQ queues. A queue is like a to-do list for background jobs.
// We define queues here and workers in /workers/*.worker.ts consume them.

import { Queue } from "bullmq";
import redis from "./redis";

// BullMQ needs a separate Redis connection config (not the ioredis instance directly)
// We extract the connection details from the URL
const connection = {
  host: new URL(process.env.REDIS_URL!).hostname,
  port: parseInt(new URL(process.env.REDIS_URL!).port || "6379"),
  password: new URL(process.env.REDIS_URL!).password || undefined,
  tls: process.env.REDIS_URL!.startsWith("rediss://") ? {} : undefined,
};

// Queue for scheduled DNS checks
// Jobs added here: { domainId: string, tenantId: string }
export const dnsPollQueue = new Queue("dns-poll", {
  connection,
  defaultJobOptions: {
    // Retry failed DNS checks up to 3 times
    attempts: 3,

    backoff: {
      // Wait longer between each retry: 5s, 10s, 20s
      type: "exponential",
      delay: 5000,
    },

    // Keep the last 100 completed jobs for debugging
    removeOnComplete: 100,

    // Keep the last 500 failed jobs so we can investigate
    removeOnFail: 500,
  },
});

// Queue for sending alerts when DNS changes are detected
// Jobs added here: { changeEventId: string, tenantId: string }
export const alertDispatchQueue = new Queue("alert-dispatch", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

console.log("BullMQ queues initialized");
