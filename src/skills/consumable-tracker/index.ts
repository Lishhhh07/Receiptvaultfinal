import { listConsumablePurchaseEvents } from "../../db/receipt-items.js";
import { listUsers } from "../../db/users.js";
import { readPatterns, readPrefs, writePatterns } from "../../memory/memory.js";
import { sendViaPreferredChannel } from "../../services/channel-delivery.js";

function isoDaysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function computeAverageReorderIntervals(events: { item_name: string; receipt_date: string }[]): Array<{
  productName: string;
  reorderIntervalDays: number;
}> {
  const grouped = new Map<string, string[]>();
  for (const e of events) {
    const dates = grouped.get(e.item_name) ?? [];
    dates.push(e.receipt_date);
    grouped.set(e.item_name, dates);
  }

  return Array.from(grouped.entries()).flatMap(([item, dates]) => {
    const sorted = dates.sort();
    if (sorted.length < 2) return [];
    let total = 0;
    let count = 0;
    for (let i = 1; i < sorted.length; i += 1) {
      total += isoDaysBetween(sorted[i - 1], sorted[i]);
      count += 1;
    }
    return [{ productName: item, reorderIntervalDays: Math.round(total / count) }];
  });
}

export async function refreshConsumablePatterns(): Promise<void> {
  let users;
  try {
    users = await listUsers();
  } catch (error) {
    console.error("[consumable-tracker] failed to list users:", (error as Error).message);
    return;
  }
  for (const user of users) {
    try {
      const events = await listConsumablePurchaseEvents(user.id);
      const reorderIntervals = computeAverageReorderIntervals(events);

      const existing = (await readPatterns(user.phone)) ?? {
        reorderIntervals: [],
        subscriptions: [],
        spendingBaselines: []
      };
      await writePatterns(user.phone, { ...existing, reorderIntervals });
    } catch (error) {
      console.error(`[consumable-tracker] refresh failed for user ${user.id}:`, (error as Error).message);
    }
  }
}

export async function sendConsumableReorderNudges(): Promise<void> {
  let users;
  try {
    users = await listUsers();
  } catch (error) {
    console.error("[consumable-tracker] failed to list users:", (error as Error).message);
    return;
  }
  const now = new Date().toISOString().slice(0, 10);

  for (const user of users) {
    try {
      const patterns = await readPatterns(user.phone);
      if (!patterns) continue;
      const prefs = await readPrefs(user.phone);
      const events = await listConsumablePurchaseEvents(user.id);

      for (const interval of patterns.reorderIntervals) {
        const matching = events
          .filter((e) => e.item_name === interval.productName)
          .map((e) => e.receipt_date)
          .sort();
        const lastDate = matching[matching.length - 1];
        if (!lastDate) continue;
        const daysSince = isoDaysBetween(lastDate, now);
        if (daysSince >= interval.reorderIntervalDays) {
          await sendViaPreferredChannel(
            user,
            prefs,
            `You usually buy ${interval.productName} every ${interval.reorderIntervalDays} days - time to reorder?`
          );
        }
      }
    } catch (error) {
      console.error(`[consumable-tracker] nudge failed for user ${user.id}:`, (error as Error).message);
    }
  }
}
