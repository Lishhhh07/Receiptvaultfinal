import { config } from "./config";
import express from "express";
import { logger } from "./utils/logger";
import healthRouter from "./routes/health";
import webhookRouter from "./routes/webhook.whatsapp";
import { alertQueue, alertWorker } from "./queue";

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use("/health", healthRouter);
app.use("/webhook/whatsapp", webhookRouter);

app.listen(config.port, () => {
  logger.info({ port: config.port }, "ReceiptVault server started");
  logger.info("BullMQ alert worker is running");
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await alertWorker.close();
  await alertQueue.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await alertWorker.close();
  await alertQueue.close();
  process.exit(0);
});
