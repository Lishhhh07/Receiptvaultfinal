import { getSupabase } from "./client.js";
import type { UserRow } from "../types/domain.js";

export async function listUsers(): Promise<UserRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("users").select("id, phone");
  if (error) throw error;
  return (data ?? []) as UserRow[];
}
