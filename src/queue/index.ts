import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  runConsumableTrackerJob,
  runDeadlineWatchJob,
  runGmailScannerJob,
  runSpendingDashboardJob,
  runSubManagerJob
} from "./jobs/index.js";

const redisUrl = process.env.REDIS_URL;
let connection: Redis | null = null;
let queue: Queue | null = null;

function getConnection(): Redis {
  if (connection) return connection;
  if (!redisUrl) throw new Error("REDIS_URL is not configured.");
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null
  });
  return connection;
}

export async function registerCronJobs(): Promise<void> {
  const skillQueue = queue ?? new Queue("skills", { connection: getConnection() });
  queue = skillQueue;
  await skillQueue.upsertJobScheduler(
    "deadline-watch-daily",
    { pattern: "0 8 * * *" },
    { name: "deadline-watch", data: {} }
  );
  await skillQueue.upsertJobScheduler("sub-manager-daily", { pattern: "30 8 * * *" }, { name: "sub-manager", data: {} });
  await skillQueue.upsertJobScheduler(
    "consumable-tracker-daily",
    { pattern: "0 9 * * *" },
    { name: "consumable-tracker", data: {} }
  );
  await skillQueue.upsertJobScheduler("gmail-scanner-daily", { pattern: "0 7 * * *" }, { name: "gmail-scanner", data: {} });
  await skillQueue.upsertJobScheduler("spending-dashboard-sunday", { pattern: "0 10 * * 0" }, { name: "spending-dashboard", data: {} });
  await skillQueue.upsertJobScheduler("spending-dashboard-monday", { pattern: "0 10 * * 1" }, { name: "spending-dashboard", data: {} });
  await skillQueue.upsertJobScheduler("spending-dashboard-tuesday", { pattern: "0 10 * * 2" }, { name: "spending-dashboard", data: {} });
  await skillQueue.upsertJobScheduler(
    "spending-dashboard-wednesday",
    { pattern: "0 10 * * 3" },
    { name: "spending-dashboard", data: {} }
  );
  await skillQueue.upsertJobScheduler("spending-dashboard-thursday", { pattern: "0 10 * * 4" }, { name: "spending-dashboard", data: {} });
  await skillQueue.upsertJobScheduler("spending-dashboard-friday", { pattern: "0 10 * * 5" }, { name: "spending-dashboard", data: {} });
  await skillQueue.upsertJobScheduler("spending-dashboard-saturday", { pattern: "0 10 * * 6" }, { name: "spending-dashboard", data: {} });
}

export function startQueueWorker(): Worker {
  const skillQueue = queue ?? new Queue("skills", { connection: getConnection() });
  queue = skillQueue;
  return new Worker(
    "skills",
    async (job) => {
      if (job.name === "deadline-watch") await runDeadlineWatchJob();
      if (job.name === "sub-manager") await runSubManagerJob();
      if (job.name === "consumable-tracker") await runConsumableTrackerJob();
      if (job.name === "gmail-scanner") await runGmailScannerJob();
      if (job.name === "spending-dashboard") await runSpendingDashboardJob();
    },
    { connection: getConnection() }
  );
}
