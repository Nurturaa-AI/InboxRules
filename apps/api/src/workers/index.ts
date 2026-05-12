// src/workers/index.ts
//
// This file starts all workers and the scheduler.
// It runs as a separate process from the HTTP server.
//
// In development both run together (simpler).
// In production you can split them into separate Railway services.

import "dotenv/config";
import { createDnsPollWorker } from "./dns-poll.worker";
import { createAlertDispatchWorker } from "./alert-dispatch.worker";
import { runScheduler } from "./scheduler";

async function startWorkers() {
  console.log("Starting InboxRules background workers...");
  console.log("");

  // Start the DNS poll worker
  // This processes jobs from the dns-poll queue
  createDnsPollWorker();

  // Start the alert dispatch worker
  // This processes jobs from the alert-dispatch queue
  createAlertDispatchWorker();

  // Start the scheduler
  // This adds jobs to the dns-poll queue on a schedule
  await runScheduler();

  console.log("");
  console.log("All workers running");

  // Keep the process alive
  // Workers run indefinitely until the process is killed
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received — shutting down workers gracefully");
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received — shutting down workers gracefully");
    process.exit(0);
  });
}

startWorkers().catch((err) => {
  console.error("Failed to start workers:", err);
  process.exit(1);
});
