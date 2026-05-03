import axios from "axios";
import { config } from "../config";
import { logger } from "../utils/logger";
import { AppError, UploadError } from "../utils/errors";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 800
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) throw e;
      attempt++;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function downloadWhatsAppImage(
  mediaId: string
): Promise<Buffer> {
  try {
    const metaResponse = await axios.get(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.meta.accessToken}` },
    });

    const mediaUrl: string = metaResponse.data.url;

    const imageResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${config.meta.accessToken}` },
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(imageResponse.data);
    logger.info(
      { mediaId, bytes: buffer.length },
      "WhatsApp image downloaded"
    );
    return buffer;
  } catch (err) {
    logger.error({ mediaId, err }, "Failed to download WhatsApp image");
    throw new UploadError(`Failed to download media ${mediaId}`);
  }
}

export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<void> {
  try {
    await withRetry(() =>
      axios.post(
        `${GRAPH_API_BASE}/${config.meta.phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${config.meta.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
    );

    logger.info({ to }, "WhatsApp message sent");
  } catch (err) {
    logger.error({ to, err }, "Failed to send WhatsApp message");
    throw new AppError(`Failed to send WhatsApp message to ${to}`);
  }
}
