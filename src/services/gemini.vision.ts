import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";
import { logger } from "../utils/logger";
import { GeminiError } from "../utils/errors";
import { RECEIPT_EXTRACTION_PROMPT } from "../skills/receipt-ingest/prompt";
import type { RawGeminiReceipt } from "../types/receipt";

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 800
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) throw e;
      attempt++;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function extractReceiptFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<RawGeminiReceipt> {
  const base64 = imageBuffer.toString("base64");

  let effectiveMime = mimeType;
  if (!ALLOWED_IMAGE_MIME.includes(mimeType as (typeof ALLOWED_IMAGE_MIME)[number])) {
    logger.warn({ mimeType }, "Unsupported image MIME type for Gemini; defaulting to image/jpeg");
    effectiveMime = "image/jpeg";
  }

  try {
    const result = await withRetry(() =>
      model.generateContent([
        {
          inlineData: {
            mimeType: effectiveMime,
            data: base64,
          },
        },
        { text: RECEIPT_EXTRACTION_PROMPT },
      ])
    );

    const response = result.response;
    let text = response.text();

    if (response.usageMetadata) {
      logger.info(
        {
          promptTokens: response.usageMetadata.promptTokenCount,
          candidateTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        },
        "Gemini token usage"
      );
    }

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    text = text.trim();

    try {
      const parsed: RawGeminiReceipt = JSON.parse(text);
      logger.info("Gemini receipt extraction successful");
      return parsed;
    } catch {
      logger.error({ rawText: text }, "Failed to parse Gemini JSON response");
      throw new GeminiError("Gemini returned invalid JSON", text);
    }
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    logger.error({ err }, "Gemini API call failed");
    throw new GeminiError(
      "Failed to extract receipt from image via Gemini",
      String(err)
    );
  }
}
