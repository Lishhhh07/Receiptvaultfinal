import { insertReceipt } from "../../db/receipts.js";
import { listUsers } from "../../db/users.js";
import { readGmailState, writeGmailState } from "../../memory/memory.js";
import { parseEmailWithGemini } from "../../services/gemini.text.js";
import { getGmailClient } from "../../services/gmail.js";

const SEARCH_QUERY = [
  "receipt",
  "invoice",
  "\"order confirmation\"",
  "\"subscription renewal\""
].join(" OR ");

function extractPlainText(parts: any[] | undefined): string {
  if (!parts) return "";
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64url").toString("utf8");
    }
    const nested = extractPlainText(part.parts);
    if (nested) return nested;
  }
  return "";
}

export function normalizeParsedReceipt(input: {
  merchant?: string;
  amount?: number;
  date?: string;
} | null): { merchant: string; amount: number; date: string } | null {
  if (!input) return null;
  if (!input.merchant || !input.date || !Number.isFinite(input.amount)) return null;
  return {
    merchant: input.merchant.trim(),
    amount: Number(input.amount),
    date: input.date
  };
}

export async function runGmailScannerSkill(): Promise<void> {
  let gmail;
  try {
    gmail = await getGmailClient();
  } catch (error) {
    console.error("[gmail-scanner] failed to initialize Gmail client:", (error as Error).message);
    return;
  }
  const users = await listUsers();

  for (const user of users) {
    const state = (await readGmailState(user.phone)) ?? { processedIds: [] };
    const processed = new Set(state.processedIds);

    let data;
    try {
      const result = await gmail.users.messages.list({
        userId: "me",
        q: SEARCH_QUERY,
        maxResults: 25
      });
      data = result.data;
    } catch (error) {
      console.error("[gmail-scanner] message list failed:", (error as Error).message);
      continue;
    }

    for (const msg of data.messages ?? []) {
      if (!msg.id || processed.has(msg.id)) continue;
      try {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full"
        });
        const body = extractPlainText(full.data.payload?.parts);
        const parsed = normalizeParsedReceipt(await parseEmailWithGemini(body));
        if (parsed) {
          await insertReceipt({
            user_id: user.id,
            merchant: parsed.merchant,
            receipt_date: parsed.date,
            total_amount: parsed.amount,
            source_email_id: msg.id
          });
        }
      } catch (error) {
        console.error(`[gmail-scanner] failed processing message ${msg.id}:`, (error as Error).message);
      }
      processed.add(msg.id);
    }

    await writeGmailState(user.phone, { processedIds: Array.from(processed).slice(-1000) });
  }
}
