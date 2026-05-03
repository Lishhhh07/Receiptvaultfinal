import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and/or SUPABASE_* key in environment.");
  }

  supabase = createClient(url, key);
  return supabase;
}
