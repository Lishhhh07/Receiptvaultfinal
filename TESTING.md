# Testing and Hardening Guide

## 1) Isolated skill tests (fake data)

Run:
- `npm test`

What this covers:
- `sub-manager` reply parsing behavior
- `consumable-tracker` reorder interval math
- `spending-dashboard` category rollups + message formatting
- `gmail-scanner` parsed payload validation for missing/invalid fields
- idempotency primitives (date window + dedupe behavior)

## 2) Gmail scanner with real test account

1. Fill `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
2. Start server: `npm run dev`
3. Open: `http://127.0.0.1:3000/auth/google`
4. Complete consent flow
5. Verify token created at `src/memory/oauth/gmail_token.json`
6. Trigger scanner via queue job or by invoking `runGmailScannerSkill()`
7. Verify:
   - records inserted into `receipts`
   - processed Gmail IDs stored in `src/memory/users/{phone}/gmail-state.yaml`
   - rerun does not duplicate rows due to `source_email_id` uniqueness

## 3) End-to-end flow simulation (WhatsApp -> DB -> alerts)

1. Insert fake receipt/subscription rows in Supabase with near-term expiry/renewal.
2. Ensure user prefs exist in `prefs.yaml` with `preferredChannel`.
3. Trigger `deadline-watch` job.
4. Confirm:
   - message delivered to chosen channel
   - `alert_sent_at` gets set
5. Trigger same job again.
6. Confirm no second alert for already-alerted rows.

## 4) Failure-mode checks

- Supabase down:
  - skills should log error and continue next users/jobs without process crash
- Gmail token expired:
  - scanner logs failure and exits gracefully
  - re-run after re-auth works
- Missing receipt fields:
  - invalid parsed payloads are dropped by `normalizeParsedReceipt`
  - DB insert validation prevents invalid values

## 5) Idempotency checklist

- Gmail ingest:
  - `receipts.source_email_id` unique index prevents duplicate email ingestion
  - scanner state keeps `processedIds`
- Alerts:
  - `mark*AlertedIfUnset` guards prevent duplicate sends for same row
- Subscription decisions:
  - update only when `user_decision` is null
