import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);
