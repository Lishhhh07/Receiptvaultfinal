import { z } from "zod";
import {
  downloadWhatsAppImage,
  sendWhatsAppMessage,
} from "../../services/whatsapp";
import { uploadToR2 } from "../../services/r2";
import { extractReceiptFromImage } from "../../services/gemini.vision";
import { ReceiptSchema } from "./schema";
import { upsertUser } from "../../db/users";
import { insertReceiptWithItems } from "../../db/receipts";
import { addDeadlineAlertJob, addWarrantyAlertJob } from "../../queue";
import { formatDeadline } from "../../utils/date";
import { formatRupees } from "../../utils/currency";
import { logger } from "../../utils/logger";

export async function receiptIngestSkill(
  phone: string,
  mediaId: string,
  mimeType: string
): Promise<void> {
  try {
    logger.info({ phone, mediaId }, "Starting receipt ingestion");

    const imageBuffer = await downloadWhatsAppImage(mediaId);
    const r2Url = await uploadToR2(imageBuffer, phone, mimeType);
    const rawData = await extractReceiptFromImage(imageBuffer, mimeType);

    const parseResult = ReceiptSchema.safeParse(rawData);
    let receipt: z.infer<typeof ReceiptSchema>;

    if (parseResult.success) {
      receipt = parseResult.data;
    } else {
      logger.warn(
        { errors: parseResult.error.issues, rawData },
        "Zod validation failed — applying safe defaults"
      );
      const fallback: z.infer<typeof ReceiptSchema> = {
        store_name:
          typeof rawData.store_name === "string"
            ? rawData.store_name
            : "Unknown Store",
        purchase_date: null,
        date_inferred: true,
        total_amount:
          typeof rawData.total_amount === "number" && rawData.total_amount > 0
            ? rawData.total_amount
            : 0.01,
        currency:
          typeof rawData.currency === "string" ? rawData.currency : "INR",
        items: Array.isArray(rawData.items)
          ? rawData.items
              .filter(
                (
                  i
                ): i is {
                  name: string;
                  quantity: number;
                  unit_price: number;
                  total_price: number;
                } =>
                  typeof i?.name === "string" &&
                  typeof i?.total_price === "number"
              )
              .map((i) => ({
                name: i.name,
                quantity: typeof i.quantity === "number" ? i.quantity : 1,
                unit_price:
                  typeof i.unit_price === "number" ? i.unit_price : 0,
                total_price: i.total_price,
              }))
          : [],
        return_deadline_days:
          typeof rawData.return_deadline_days === "number"
            ? rawData.return_deadline_days
            : null,
        warranty_period_days:
          typeof rawData.warranty_period_days === "number"
            ? rawData.warranty_period_days
            : null,
        payment_method:
          typeof rawData.payment_method === "string"
            ? rawData.payment_method
            : null,
        raw_text:
          typeof rawData.raw_text === "string" ? rawData.raw_text : "",
      };
      receipt = fallback;
    }

    const userId = await upsertUser(phone);

    const receiptId = await insertReceiptWithItems(
      {
        userId,
        r2Url,
        rawGeminiJson: rawData as Record<string, unknown>,
        ...receipt,
      },
      receipt.items
    );

    if (
      receipt.return_deadline_days != null &&
      receipt.return_deadline_days > 0
    ) {
      await addDeadlineAlertJob(
        receiptId,
        phone,
        receipt.return_deadline_days,
        receipt.purchase_date
      );
    }

    if (
      receipt.warranty_period_days != null &&
      receipt.warranty_period_days > 0
    ) {
      await addWarrantyAlertJob(
        receiptId,
        phone,
        receipt.warranty_period_days,
        receipt.purchase_date
      );
    }

    let confirmationMessage =
      `✅ Receipt saved!\n` +
      `🏪 ${receipt.store_name}\n` +
      `💰 ${formatRupees(receipt.total_amount)}\n` +
      `📅 Purchased: ${receipt.purchase_date ?? "Unknown date"}`;

    if (
      receipt.return_deadline_days != null &&
      receipt.return_deadline_days > 0 &&
      receipt.purchase_date
    ) {
      const deadlineDate = formatDeadline(
        receipt.purchase_date,
        receipt.return_deadline_days
      );
      confirmationMessage += `\n⏰ Return deadline: ${receipt.return_deadline_days} days (${deadlineDate})`;
    }

    confirmationMessage +=
      "\n\nReply with any question about this receipt.";

    await sendWhatsAppMessage(phone, confirmationMessage);

    logger.info(
      { receiptId, phone },
      "Receipt ingestion completed successfully"
    );
  } catch (err) {
    logger.error({ err, phone, mediaId }, "Receipt ingestion failed");
    try {
      await sendWhatsAppMessage(
        phone,
        "⚠️ Couldn't process your receipt. Please try a clearer photo."
      );
    } catch (sendErr) {
      logger.error({ sendErr, phone }, "Failed to send error message to user");
    }
    throw err;
  }
}
