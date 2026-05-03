# Receipt Ingest Skill

## Overview

This skill handles the end-to-end ingestion of a receipt image sent via WhatsApp. It downloads the image from Meta's Graph API, uploads it to Cloudflare R2 for permanent storage, extracts structured data using Google Gemini Vision, validates the output with Zod, persists everything to Supabase, and sends a confirmation message back to the user on WhatsApp. If a return deadline is detected, it schedules BullMQ alert jobs to remind the user before the window closes.

## Trigger

User sends an image message to the ReceiptVault WhatsApp number.

## Input

- `phone` — The sender's phone number (from the WhatsApp webhook payload).
- `mediaId` — The Meta media ID of the image attachment.

## Steps

1. **Download image** — Fetch the image binary from Meta Graph API using the media ID.
2. **Upload to R2** — Store the image in Cloudflare R2 under `receipts/{phone}/{timestamp}.jpg` and obtain a public URL.
3. **Extract receipt data** — Send the base64-encoded image to Gemini 2.0 Flash with a structured extraction prompt.
4. **Validate with Zod** — Parse the Gemini response against `ReceiptSchema`. If validation fails, retry with sensible defaults (e.g., null date, `date_inferred: true`).
5. **Upsert user** — Ensure the sender exists in the `users` table (upsert on phone number).
6. **Insert receipt** — Write the validated receipt data and raw Gemini JSON to the `receipts` table.
7. **Insert receipt items** — Bulk-insert all line items into `receipt_items`.
8. **Schedule alerts** — If `return_deadline_days` is present and > 0, enqueue BullMQ jobs to alert at 7 days, 3 days, and 1 day before the return window closes.
9. **Send confirmation** — Reply to the user on WhatsApp with a summary of the saved receipt.

## Output

- A WhatsApp text message confirming the receipt was saved, including store name, total amount, purchase date, and return deadline (if applicable).
- Database rows in `receipts` and `receipt_items`.
- Scheduled alert jobs in the `receipt-alerts` BullMQ queue (if applicable).

## Error Handling

- The entire flow is wrapped in a try/catch.
- On failure, the user receives: "⚠️ Couldn't process your receipt. Please try a clearer photo."
- The original error is re-thrown after notifying the user so it can be logged upstream.
- Individual service errors use typed error classes (`UploadError`, `GeminiError`, `AppError`).

## Dependencies

- **Meta Graph API** — Image download and WhatsApp messaging.
- **Cloudflare R2** — Image storage (via S3-compatible API).
- **Google Gemini 2.0 Flash** — Vision-based receipt data extraction.
- **Supabase** — PostgreSQL database for users, receipts, and receipt items.
- **BullMQ + Redis** — Scheduled return-deadline alert jobs.
