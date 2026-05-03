export async function sendTelegramReply(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`[telegram:dry-run] -> ${chatId}: ${message}`);
    return;
  }

  // Frontend/Infra dev should replace with real Telegram Bot API integration.
  console.log(`[telegram:token-present] -> ${chatId}: ${message}`);
}
