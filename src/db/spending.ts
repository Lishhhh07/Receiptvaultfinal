import { getSupabase } from "./client.js";

export type CategorySpendEvent = {
  category: string;
  amount: number;
  receipt_date: string;
};

export async function listCategorySpendEvents(userId: string, fromDate: string, toDate: string): Promise<CategorySpendEvent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("receipt_items")
    .select("category, quantity, unit_price, receipts!inner(receipt_date, user_id)")
    .eq("receipts.user_id", userId)
    .gte("receipts.receipt_date", fromDate)
    .lte("receipts.receipt_date", toDate);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    category: row.category ?? "uncategorized",
    amount: Number(row.quantity ?? 0) * Number(row.unit_price ?? 0),
    receipt_date: row.receipts.receipt_date as string
  }));
}
