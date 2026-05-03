import type { ConnectionOptions } from "bullmq";
import { Queue, Worker, Job } from "bullmq";
import { config } from "../config";
import { logger } from "../utils/logger";
import { processDeadlineAlert } from "./jobs/deadline-alert";

function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

const MS_PER_DAY = 86400000;

function parsePurchaseDateUtc(purchaseDate: string): Date | null {
  const trimmed = purchaseDate.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(y, m, d));
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const dd = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10) - 1;
    const yyyy = parseInt(parts[2], 10);
    if (!Number.isNaN(dd) && !Number.isNaN(mm + 1) && !Number.isNaN(yyyy)) {
      return new Date(Date.UTC(yyyy, mm, dd));
    }
  }
  return null;
}

function addUtcCalendarDays(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

const queueConnection = parseRedisUrl(config.redis.url);
const workerConnection = parseRedisUrl(config.redis.url);

export const alertQueue = new Queue("receipt-alerts", {
  connection: queueConnection,
});

export type JobHandler = (job: Job<any>) => Promise<void>;

export const jobRegistry = new Map<string, JobHandler>();

jobRegistry.set("deadline-alert", processDeadlineAlert);

export const alertWorker = new Worker(
  "receipt-alerts",
  async (job: Job<any>) => {
    const handler = jobRegistry.get(job.name);
    if (handler) {
      await handler(job);
    } else {
      logger.warn({ jobName: job.name }, "Unknown job type received");
    }
  },
  { connection: workerConnection }
);

alertWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "Job completed");
});

alertWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, err },
    "Job failed"
  );
});

export async function addDeadlineAlertJob(
  receiptId: string,
  phone: string,
  deadlineDays: number,
  purchaseDate: string | null
): Promise<void> {
  const alertDaysBefore = [7, 3, 1];

  for (const daysBefore of alertDaysBefore) {
    const daysRemaining = daysBefore;
    let delayMs: number;

    if (purchaseDate != null) {
      const parsed = parsePurchaseDateUtc(purchaseDate);
      if (parsed) {
        const deadlineDate = addUtcCalendarDays(parsed, deadlineDays);
        delayMs =
          deadlineDate.getTime() - daysBefore * MS_PER_DAY - Date.now();
      } else {
        delayMs = (deadlineDays - daysBefore) * MS_PER_DAY;
      }
    } else {
      delayMs = (deadlineDays - daysBefore) * MS_PER_DAY;
    }

    if (delayMs <= 0) continue;

    const jobId = `deadline-${receiptId}-${daysRemaining}`;

    await alertQueue.add(
      "deadline-alert",
      {
        receiptId,
        phone,
        alertType: "return_deadline" as const,
        daysRemaining,
      },
      {
        delay: delayMs,
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info(
      { jobId, delayMs, daysRemaining, receiptId },
      "Deadline alert job scheduled"
    );
  }
}

export async function addWarrantyAlertJob(
  receiptId: string,
  phone: string,
  warrantyDays: number,
  purchaseDate: string | null
): Promise<void> {
  const alertDaysBefore = [30, 7, 1];

  for (const daysBefore of alertDaysBefore) {
    let delayMs: number;

    if (purchaseDate != null) {
      const parsed = parsePurchaseDateUtc(purchaseDate);
      if (parsed) {
        const expiryDate = addUtcCalendarDays(parsed, warrantyDays);
        delayMs = expiryDate.getTime() - daysBefore * MS_PER_DAY - Date.now();
      } else {
        delayMs = (warrantyDays - daysBefore) * MS_PER_DAY;
      }
    } else {
      delayMs = (warrantyDays - daysBefore) * MS_PER_DAY;
    }

    if (delayMs <= 0) continue;

    const jobId = `warranty-${receiptId}-${daysBefore}`;

    await alertQueue.add(
      "deadline-alert",
      {
        receiptId,
        phone,
        alertType: "warranty" as const,
        daysRemaining: daysBefore,
      },
      {
        delay: delayMs,
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info(
      { jobId, delayMs, daysBefore, receiptId },
      "Warranty alert job scheduled"
    );
  }
}
