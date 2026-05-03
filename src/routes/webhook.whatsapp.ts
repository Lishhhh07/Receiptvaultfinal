import { Router, Request, Response } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";
import { receiptIngestSkill } from "../skills/receipt-ingest";
import type { WhatsAppWebhookPayload } from "../types/webhook";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && token === config.meta.verifyToken) {
    logger.info("Webhook verification successful");
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, "Webhook verification failed");
  res.sendStatus(403);
});

router.post("/", (req: Request, res: Response) => {
  const body = req.body as WhatsAppWebhookPayload;

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      logger.warn("Webhook received with no value payload");
      res.sendStatus(200);
      return;
    }

    if (value.statuses) {
      logger.debug("Delivery status update received, ignoring");
      res.sendStatus(200);
      return;
    }

    const message = value.messages?.[0];
    if (!message) {
      logger.debug("No messages in webhook payload");
      res.sendStatus(200);
      return;
    }

    const { type, from: phone, id: messageId } = message;
    logger.info({ type, phone, messageId }, "Incoming WhatsApp message");

    if (type !== "image") {
      logger.info({ type }, "Non-image message type, ignoring");
      res.sendStatus(200);
      return;
    }

    const mediaId = message.image?.id;
    const mimeType = message.image?.mime_type ?? "image/jpeg";
    if (!mediaId) {
      logger.warn("Image message received without media ID");
      res.sendStatus(200);
      return;
    }

    logger.info({ phone, mediaId }, "Image received, triggering receipt ingestion");

    // Fire and forget — Meta requires fast ack
    receiptIngestSkill(phone, mediaId, mimeType).catch((err) => {
      logger.error(
        { err, phone, mediaId, mimeType },
        "Receipt ingestion failed (async)"
      );
    });

    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, "Unhandled error in webhook handler");
    res.sendStatus(200);
  }
});

export default router;
