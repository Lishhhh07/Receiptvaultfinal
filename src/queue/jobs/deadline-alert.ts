import { Job } from "bullmq";
import { getReceiptById } from "../../db/receipts";
import { sendWhatsAppMessage } from "../../services/whatsapp";
import { logger } from "../../utils/logger";
import { formatRupees } from "../../utils/currency";

export interface DeadlineAlertJobData {
  receiptId: string;
  phone: string;
  alertType: "return_deadline" | "warranty";
  daysRemaining: number;
}

export async function processDeadlineAlert(
  job: Job<DeadlineAlertJobData>
): Promise<void> {
  const { receiptId, phone, daysRemaining } = job.data;

  logger.info({ receiptId, phone, daysRemaining }, "Processing deadline alert");

  const receipt = await getReceiptById(receiptId);

  if (!receipt) {
    logger.warn({ receiptId }, "Receipt not found for deadline alert, skipping");
    return;
  }

  const storeName = (receipt.store_name as string) || "your purchase";
  const totalAmount = receipt.total_amount as number;

  const isWarranty = job.data.alertType === "warranty";

  const deadlineField = isWarranty ? "warranty_expiry" : "return_deadline";
  const deadlineValue = receipt[deadlineField] as string | null;

  let deadlineDateStr = "soon";
  if (deadlineValue) {
    deadlineDateStr = new Date(deadlineValue).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const message = isWarranty
    ? `🛡️ Warranty for ${storeName} expires in ${daysRemaining} day(s) — ${deadlineDateStr}.\n\nTotal paid: ${formatRupees(totalAmount)}`
    : `⏰ Heads up! Your return window for ${storeName} closes in ${daysRemaining} day(s) — ${deadlineDateStr}.\n\nTotal paid: ${formatRupees(totalAmount)}`;

  await sendWhatsAppMessage(phone, message);

  logger.info(
    { receiptId, phone, daysRemaining },
    "Deadline alert sent"
  );
}
