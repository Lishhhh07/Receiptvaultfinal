import { getReceiptsExpiringByDate, markReceiptAlertedIfUnset } from "../../db/receipts.js";
import { getRenewalsByDate, markSubscriptionAlertedIfUnset } from "../../db/subscriptions.js";
import { listUsers } from "../../db/users.js";
import { readPrefs } from "../../memory/memory.js";
import { sendViaPreferredChannel } from "../../services/channel-delivery.js";

function daysUntil(targetIsoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetIsoDate);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isWithinAlertWindow(targetIsoDate: string, alertTimingDays: number): boolean {
  const d = daysUntil(targetIsoDate);
  return d >= 0 && d <= alertTimingDays;
}

export async function runDeadlineWatchSkill(): Promise<void> {
  let users;
  try {
    users = await listUsers();
  } catch (error) {
    console.error("[deadline-watch] failed to list users:", (error as Error).message);
    return;
  }

  for (const user of users) {
    try {
      const prefs = await readPrefs(user.phone);
      const alertTimingDays = prefs?.alertTimingDays ?? 3;
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + alertTimingDays);
      const maxDateIso = maxDate.toISOString().slice(0, 10);

      const [receipts, renewals] = await Promise.all([
        getReceiptsExpiringByDate(maxDateIso),
        getRenewalsByDate(maxDateIso)
      ]);

      for (const receipt of receipts.filter((r) => r.user_id === user.id && !r.alert_sent_at && r.expiry_date)) {
        const d = daysUntil(receipt.expiry_date as string);
        if (!isWithinAlertWindow(receipt.expiry_date as string, alertTimingDays)) continue;
        const marked = await markReceiptAlertedIfUnset(receipt.id);
        if (!marked) continue;
        const message = `Reminder: receipt from ${receipt.merchant} expires in ${d} day(s) on ${receipt.expiry_date}.`;
        await sendViaPreferredChannel(user, prefs, message);
      }

      for (const sub of renewals.filter((s) => s.user_id === user.id && !s.alert_sent_at)) {
        const d = daysUntil(sub.renewal_date);
        if (!isWithinAlertWindow(sub.renewal_date, alertTimingDays)) continue;
        const marked = await markSubscriptionAlertedIfUnset(sub.id);
        if (!marked) continue;
        const message = `Subscription ${sub.name} renews in ${d} day(s) on ${sub.renewal_date}.`;
        await sendViaPreferredChannel(user, prefs, message);
      }
    } catch (error) {
      console.error(`[deadline-watch] failed for user ${user.id}:`, (error as Error).message);
    }
  }
}
