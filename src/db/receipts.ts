import { supabase } from "./client";
import { logger } from "../utils/logger";
import { AppError } from "../utils/errors";
import type { Receipt, ReceiptItem } from "../types/receipt";

interface InsertReceiptData extends Receipt {
  userId: string;
  r2Url: string;
  rawGeminiJson: Record<string, unknown>;
}

function toIsoDate(ddmmyyyy: string | null): string | null {
  if (!ddmmyyyy) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(ddmmyyyy)) return ddmmyyyy.slice(0, 10);
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`;
}

function computeDeadlineTimestamp(
  purchaseDateInput: string | null,
  days: number | null
): string | null {
  if (!purchaseDateInput || days == null) return null;
  const iso = toIsoDate(purchaseDateInput) ?? purchaseDateInput.slice(0, 10);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function insertReceipt(data: InsertReceiptData): Promise<string> {
  const { data: row, error } = await supabase
    .from("receipts")
    .insert({
      user_id: data.userId,
      image_url: data.r2Url,
      store_name: data.store_name,
      purchase_date: toIsoDate(data.purchase_date),
      total_amount: data.total_amount,
      currency: data.currency,
      return_deadline: computeDeadlineTimestamp(
        data.purchase_date,
        data.return_deadline_days
      ),
      warranty_expiry: computeDeadlineTimestamp(
        data.purchase_date,
        data.warranty_period_days
      ),
      date_inferred: data.date_inferred,
      gemini_raw: data.rawGeminiJson,
    })
    .select("id")
    .single();

  if (error || !row) {
    logger.error({ error }, "Failed to insert receipt");
    throw new AppError("Failed to insert receipt");
  }

  logger.info({ receiptId: row.id }, "Receipt inserted");
  return row.id;
}

export async function insertReceiptWithItems(
  data: InsertReceiptData,
  items: ReceiptItem[]
): Promise<string> {
  const { data: receiptId, error } = await supabase.rpc(
    "insert_receipt_with_items",
    {
      p_user_id: data.userId,
      p_image_url: data.r2Url,
      p_store_name: data.store_name,
      p_purchase_date: toIsoDate(data.purchase_date),
      p_total_amount: data.total_amount,
      p_currency: data.currency,
      p_return_deadline: computeDeadlineTimestamp(
        data.purchase_date,
        data.return_deadline_days
      ),
      p_warranty_expiry: computeDeadlineTimestamp(
        data.purchase_date,
        data.warranty_period_days
      ),
      p_date_inferred: data.date_inferred,
      p_gemini_raw: data.rawGeminiJson,
      p_items: items,
    }
  );

  if (error || !receiptId) {
    logger.error({ error }, "Failed to insert receipt with items");
    throw new AppError("Failed to insert receipt");
  }

  logger.info({ receiptId }, "Receipt with items inserted");
  return receiptId as string;
}

export async function getReceiptById(
  receiptId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", receiptId)
    .single();

  if (error) {
    logger.error({ error, receiptId }, "Failed to fetch receipt");
    return null;
  }

  return data;
}
