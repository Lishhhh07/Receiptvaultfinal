import "dotenv/config";
import express from "express";
import healthRouter from "./routes/health.js";
import gmailRouter from "./routes/gmail.js";
import whatsappWebhookRouter from "./routes/webhook.whatsapp.js";
import telegramWebhookRouter from "./routes/webhook.telegram.js";
import { registerCronJobs, startQueueWorker } from "./queue/index.js";
import { listSkills, runSkill } from "./skills/index.js";

const app = express();
app.use(express.json());

app.use(healthRouter);
app.use(gmailRouter);
app.use(whatsappWebhookRouter);
app.use(telegramWebhookRouter);

app.get("/skills", (_req, res) => {
  res.json({ skills: listSkills() });
});

app.get("/skills/hello-world", (req, res) => {
  const userId = String(req.query.userId ?? "demo-user");
  const context = typeof req.query.context === "string" ? req.query.context : undefined;
  res.json(runSkill("hello-world", { userId, context }));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`receiptvault server listening on ${port}`);
});

if (process.env.ENABLE_QUEUE === "true") {
  registerCronJobs()
    .then(() => {
      startQueueWorker();
      console.log("bullmq cron jobs registered");
    })
    .catch((error) => {
      console.warn("queue init skipped:", (error as Error).message);
    });
} else {
  console.log("queue disabled; set ENABLE_QUEUE=true to activate BullMQ jobs");
}
