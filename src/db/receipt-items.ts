import { getSupabase } from "./client.js";

export type ConsumableItemAggregate = {
  item_name: string;
  category: string | null;
  receipt_date: string;
};

export async function listConsumablePurchaseEvents(userId: string): Promise<ConsumableItemAggregate[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("receipt_items")
    .select("item_name, category, receipts!inner(receipt_date, user_id)")
    .in("category", ["groceries", "household"])
    .eq("receipts.user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    item_name: row.item_name,
    category: row.category ?? null,
    receipt_date: row.receipts.receipt_date as string
  }));
}
