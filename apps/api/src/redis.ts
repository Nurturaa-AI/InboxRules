// src/redis.ts
// Creates the Redis connection used by both the cache and BullMQ queue.
// Upstash Redis requires the 'rediss://' protocol (note the extra 's')
// which means TLS is enabled — this is required for Upstash.

import Redis from "ioredis";

// Edge case: if REDIS_URL is not set, fail loudly at startup
// rather than failing silently on the first cache operation
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

// BullMQ needs a separate connection config object (not the ioredis instance).
// Extracted here to avoid parsing the URL multiple times in queue.ts.
export const redisConnectionConfig = {
  host: new URL(process.env.REDIS_URL).hostname,
  port: parseInt(new URL(process.env.REDIS_URL).port || "6379"),
  password: new URL(process.env.REDIS_URL).password || undefined,
  tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
};

const redis = new Redis(process.env.REDIS_URL, {
  // Upstash requires TLS — this enables it
  tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,

  // Retry failed connections up to 3 times before giving up
  maxRetriesPerRequest: 3,

  // Wait 500ms between retry attempts
  retryStrategy: (times) => {
    if (times > 3) {
      // After 3 retries, stop trying and throw an error
      return null;
    }
    // Wait longer between each retry: 500ms, 1000ms, 1500ms
    return times * 500;
  },
});

// Log when connection is established
redis.on("connect", () => {
  console.log("Redis connected");
});

// Log any Redis errors without crashing the app
redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

export default redis;
