import type { UserRow } from "../types/domain.js";
import type { Prefs } from "../memory/memory.js";
import { sendTelegramReply } from "./telegram.js";
import { sendWhatsAppReply } from "./whatsapp.js";

function hasWhatsApp(user: UserRow): boolean {
  return Boolean(user.phone);
}

function hasTelegram(prefs: Prefs | null): prefs is Prefs & { telegramChatId: string } {
  return Boolean(prefs?.telegramChatId);
}

export async function sendViaPreferredChannel(user: UserRow, prefs: Prefs | null, message: string): Promise<void> {
  const preferred = prefs?.preferredChannel ?? "whatsapp";
  const canWhatsApp = hasWhatsApp(user);
  const canTelegram = hasTelegram(prefs);

  if (preferred === "telegram") {
    if (canTelegram) return sendTelegramReply(prefs.telegramChatId, message);
    if (canWhatsApp) return sendWhatsAppReply(user.phone, message);
  } else {
    if (canWhatsApp) return sendWhatsAppReply(user.phone, message);
    if (canTelegram) return sendTelegramReply(prefs.telegramChatId, message);
  }

  throw new Error(`No delivery channel available for user ${user.id}.`);
}
