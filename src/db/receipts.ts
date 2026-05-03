import { getSupabase } from "./client.js";
import type { ReceiptRow } from "../types/domain.js";

export async function getReceiptsExpiringByDate(maxDateIso: string): Promise<ReceiptRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("receipts")
    .select("id, user_id, merchant, receipt_date, expiry_date, total_amount, alert_sent_at")
    .not("expiry_date", "is", null)
    .lte("expiry_date", maxDateIso);
  if (error) throw error;
  return (data ?? []) as ReceiptRow[];
}

export async function markReceiptAlerted(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("receipts").update({ alert_sent_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markReceiptAlertedIfUnset(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("receipts")
    .update({ alert_sent_at: new Date().toISOString() })
    .eq("id", id)
    .is("alert_sent_at", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function insertReceipt(input: {
  user_id: string;
  merchant: string;
  receipt_date: string;
  total_amount: number;
  expiry_date?: string;
  source_email_id?: string;
}): Promise<void> {
  if (!input.user_id || !input.merchant || !input.receipt_date) {
    throw new Error("insertReceipt received missing required fields.");
  }
  if (!Number.isFinite(input.total_amount)) {
    throw new Error("insertReceipt total_amount must be a finite number.");
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("receipts")
    .upsert(
      {
        user_id: input.user_id,
        merchant: input.merchant,
        receipt_date: input.receipt_date,
        total_amount: input.total_amount,
        expiry_date: input.expiry_date ?? null,
        source_email_id: input.source_email_id ?? null
      },
      { onConflict: "source_email_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}
