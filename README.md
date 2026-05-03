# receiptvault

Local dev setup:

1. `cp .env.example .env`
2. Fill `SUPABASE_URL`, `SUPABASE_ANON_KEY` (and optional `SUPABASE_SERVICE_ROLE_KEY`)
3. `npm install`
4. `npm run build`
5. `npm run dev`

Useful endpoints:
- `GET /health`
- `POST /webhook/whatsapp`
- `POST /webhook/telegram`
- `GET /skills`
- `GET /skills/hello-world?userId=sourav&context=test`
- `GET /auth/google`
- `GET /auth/google/callback?code=...`

Memory system:
- `src/memory/memory.ts` exposes:
  - `readPrefs(phone)`
  - `writePrefs(phone, prefs)`
  - `readPatterns(phone)`
  - `writePatterns(phone, patterns)`

Step 2 skills wired:
- `deadline-watch`: checks expiry/renewal windows, sends WhatsApp, marks `alert_sent_at`
- `sub-manager`: prompts KEEP/CANCEL and updates subscription state from webhook replies
- `gmail-scanner`: OAuth + Gmail search + Gemini parse + Supabase insert + processed email tracking
- `consumable-tracker`: computes reorder intervals and sends nudges
- `spending-dashboard`: weekly category totals with previous-week comparison

Channel routing:
- Skills send via preferred channel from `prefs.yaml` (`preferredChannel: whatsapp|telegram`)
- Telegram delivery uses `prefs.yaml` field `telegramChatId`
- If preferred channel is unavailable, sender falls back to the other available channel

Subscription reply format:
- `KEEP <subscription-uuid>`
- `CANCEL <subscription-uuid>`
