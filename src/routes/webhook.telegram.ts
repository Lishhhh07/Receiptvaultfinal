import { Router } from "express";
import { handleSubscriptionReply } from "../skills/sub-manager/index.js";
import { sendTelegramReply } from "../services/telegram.js";

const telegramWebhookRouter = Router();

telegramWebhookRouter.post("/webhook/telegram", async (req, res) => {
  const chatId = String(req.body?.chatId ?? req.body?.message?.chat?.id ?? "");
  const text = String(req.body?.text ?? req.body?.message?.text ?? "");

  try {
    if (chatId && text) {
      const confirmation = await handleSubscriptionReply(text);
      await sendTelegramReply(chatId, confirmation);
    }
    res.json({ received: true, provider: "telegram" });
  } catch (error) {
    res.status(500).json({ received: false, error: (error as Error).message });
  }
});

export default telegramWebhookRouter;
