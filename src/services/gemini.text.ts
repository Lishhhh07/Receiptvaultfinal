export type ParsedEmailPayload = {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  subscriptionName?: string;
  renewalDate?: string;
};

export async function parseEmailWithGemini(emailBody: string): Promise<ParsedEmailPayload | null> {
  if (!emailBody.trim()) return null;
  // Placeholder for AI/Data Dev Gemini prompt integration.
  return {
    merchant: "parsed-email-merchant",
    amount: 0,
    date: new Date().toISOString().slice(0, 10)
  };
}
