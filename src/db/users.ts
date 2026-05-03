import { supabase } from "./client";
import { logger } from "../utils/logger";
import { AppError } from "../utils/errors";

export async function upsertUser(phone: string): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .upsert({ phone_number: phone }, { onConflict: "phone_number" })
    .select("id")
    .single();

  if (error || !data) {
    logger.error({ error, phone }, "Failed to upsert user");
    throw new AppError(`Failed to upsert user for phone: ${phone}`);
  }

  logger.info({ userId: data.id, phone }, "User upserted");
  return data.id;
}
