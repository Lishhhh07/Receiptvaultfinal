import { Router } from "express";
import { handleSubscriptionReply } from "../skills/sub-manager/index.js";
import { sendWhatsAppReply } from "../services/whatsapp.js";

const whatsappWebhookRouter = Router();

whatsappWebhookRouter.post("/webhook/whatsapp", async (req, res) => {
  const from = String(req.body?.from ?? "");
  const text = String(req.body?.text ?? "");

  try {
    if (text) {
      const confirmation = await handleSubscriptionReply(text);
      if (from) {
        await sendWhatsAppReply(from, confirmation);
      }
    }
    res.json({ received: true, provider: "whatsapp" });
  } catch (error) {
    res.status(500).json({ received: false, error: (error as Error).message });
  }
});

export default whatsappWebhookRouter;
