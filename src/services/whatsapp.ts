export async function sendWhatsAppReply(phone: string, message: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.log(`[whatsapp:dry-run] -> ${phone}: ${message}`);
    return;
  }

  // Dev 1 should replace this with their actual sender implementation.
  console.log(`[whatsapp:token-present] -> ${phone}: ${message}`);
}
