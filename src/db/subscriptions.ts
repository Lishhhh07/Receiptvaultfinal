import { getSupabase } from "./client.js";
import type { SubscriptionRow } from "../types/domain.js";

export async function getRenewalsByDate(maxDateIso: string): Promise<SubscriptionRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, name, renewal_date, amount, billing_cycle, is_active, user_decision, alert_sent_at")
    .eq("is_active", true)
    .lte("renewal_date", maxDateIso);
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

export async function markSubscriptionAlerted(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("subscriptions")
    .update({ alert_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markSubscriptionAlertedIfUnset(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ alert_sent_at: new Date().toISOString() })
    .eq("id", id)
    .is("alert_sent_at", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function updateSubscriptionDecision(id: string, decision: "KEEP" | "CANCEL"): Promise<void> {
  const supabase = getSupabase();
  const nextValues =
    decision === "KEEP" ? { user_decision: "KEEP" } : { user_decision: "CANCEL", is_active: false };
  const { error } = await supabase.from("subscriptions").update(nextValues).eq("id", id).is("user_decision", null);
  if (error) throw error;
}
