import { supabase } from "./client";
import { logger } from "../utils/logger";
import { AppError } from "../utils/errors";
import type { ReceiptItem } from "../types/receipt";

export async function insertReceiptItems(
  receiptId: string,
  userId: string,
  items: ReceiptItem[]
): Promise<void> {
  if (items.length === 0) {
    logger.info({ receiptId }, "No receipt items to insert");
    return;
  }

  const rows = items.map((item) => ({
    receipt_id: receiptId,
    user_id: userId,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error } = await supabase.from("receipt_items").insert(rows);

  if (error) {
    logger.error({ error, receiptId }, "Failed to insert receipt items");
    throw new AppError("Failed to insert receipt items");
  }

  logger.info(
    { receiptId, itemCount: items.length },
    "Receipt items inserted"
  );
}
