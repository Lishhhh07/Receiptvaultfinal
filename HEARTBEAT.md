# HEARTBEAT

Source of truth for autonomous schedule (BullMQ cron), local timezone.

Prerequisite:
- Set `ENABLE_QUEUE=true` and a valid `REDIS_URL`.

Daily schedule:
- 07:00 - `gmail-scanner` (scan receipts/invoices/renewals from Gmail)
- 08:00 - `deadline-watch` (expiry + renewal reminders)
- 08:30 - `sub-manager` (KEEP/CANCEL renewal prompt)
- 09:00 - `consumable-tracker` (refresh intervals + reorder nudges)

Weekly schedule:
- 10:00 Sunday - `spending-dashboard` weekly run
- 10:00 Monday - `spending-dashboard` weekly run
- 10:00 Tuesday - `spending-dashboard` weekly run
- 10:00 Wednesday - `spending-dashboard` weekly run
- 10:00 Thursday - `spending-dashboard` weekly run
- 10:00 Friday - `spending-dashboard` weekly run
- 10:00 Saturday - `spending-dashboard` weekly run

Note:
- `spending-dashboard` sends only for users whose `prefs.yaml` has matching `weeklyDigestDay` (defaults to `sunday`).
- All outbound skill notifications use preferred channel from `prefs.yaml` (`whatsapp` or `telegram`) with automatic fallback to available channel.
