import { getRenewalsByDate, updateSubscriptionDecision } from "../../db/subscriptions.js";
import { listUsers } from "../../db/users.js";
import { readPrefs } from "../../memory/memory.js";
import { sendViaPreferredChannel } from "../../services/channel-delivery.js";

export async function runSubManagerPromptSkill(): Promise<void> {
  let users;
  try {
    users = await listUsers();
  } catch (error) {
    console.error("[sub-manager] failed to list users:", (error as Error).message);
    return;
  }
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 5);
  const maxDateIso = upcomingDate.toISOString().slice(0, 10);
  let renewals;
  try {
    renewals = await getRenewalsByDate(maxDateIso);
  } catch (error) {
    console.error("[sub-manager] failed to fetch renewals:", (error as Error).message);
    return;
  }

  for (const user of users) {
    try {
      const prefs = await readPrefs(user.phone);
      const alertTimingDays = prefs?.alertTimingDays ?? 3;
      for (const sub of renewals.filter((s) => s.user_id === user.id && !s.user_decision)) {
        const days = Math.floor(
          (new Date(sub.renewal_date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
        );
        if (days > alertTimingDays) continue;
        await sendViaPreferredChannel(
          user,
          prefs,
          `Your subscription "${sub.name}" renews on ${sub.renewal_date}. Reply KEEP or CANCEL for ${sub.id}.`
        );
      }
    } catch (error) {
      console.error(`[sub-manager] failed for user ${user.id}:`, (error as Error).message);
    }
  }
}

export async function handleSubscriptionReply(messageText: string): Promise<string> {
  const normalized = messageText.trim().toUpperCase();
  const keep = normalized.match(/^KEEP\s+([a-f0-9-]{36})$/i);
  const cancel = normalized.match(/^CANCEL\s+([a-f0-9-]{36})$/i);

  if (keep?.[1]) {
    await updateSubscriptionDecision(keep[1], "KEEP");
    return `Confirmed: subscription ${keep[1]} marked KEEP.`;
  }
  if (cancel?.[1]) {
    await updateSubscriptionDecision(cancel[1], "CANCEL");
    return `Confirmed: subscription ${cancel[1]} marked CANCEL.`;
  }
  return "Please reply in format: KEEP <subscription-id> or CANCEL <subscription-id>.";
}
