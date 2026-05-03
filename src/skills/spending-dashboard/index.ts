import { listCategorySpendEvents } from "../../db/spending.js";
import { listUsers } from "../../db/users.js";
import { readPrefs } from "../../memory/memory.js";
import { sendViaPreferredChannel } from "../../services/channel-delivery.js";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function sumByCategory(events: { category: string; amount: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const event of events) {
    totals.set(event.category, (totals.get(event.category) ?? 0) + event.amount);
  }
  return totals;
}

function formatMoney(value: number): string {
  return `Rs ${value.toFixed(2)}`;
}

export function formatDashboardMessage(
  currentTotals: Map<string, number>,
  previousTotals: Map<string, number>,
  fromDate: string,
  toDate: string
): string {
  const categories = Array.from(new Set([...currentTotals.keys(), ...previousTotals.keys()])).sort();
  const lines: string[] = [`Weekly spending dashboard (${fromDate} to ${toDate})`, ""];
  let grandTotal = 0;

  for (const category of categories) {
    const current = currentTotals.get(category) ?? 0;
    const previous = previousTotals.get(category) ?? 0;
    const delta = current - previous;
    const trend = delta > 0 ? `(+${formatMoney(delta)})` : `(${formatMoney(delta)})`;
    grandTotal += current;
    lines.push(`- ${category}: ${formatMoney(current)} ${trend}`);
  }

  lines.push("");
  lines.push(`Grand total: ${formatMoney(grandTotal)}`);
  return lines.join("\n");
}

export async function runSpendingDashboardSkill(): Promise<void> {
  let users;
  try {
    users = await listUsers();
  } catch (error) {
    console.error("[spending-dashboard] failed to list users:", (error as Error).message);
    return;
  }
  const now = new Date();
  const todayDay = DAY_NAMES[now.getDay()];

  for (const user of users) {
    try {
      const prefs = await readPrefs(user.phone);
      const preferred = prefs?.weeklyDigestDay ?? "sunday";
      if (preferred !== todayDay) continue;

      const to = new Date(now);
      const from = new Date(now);
      from.setDate(from.getDate() - 6);

      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - 6);

      const [currentEvents, previousEvents] = await Promise.all([
        listCategorySpendEvents(user.id, isoDate(from), isoDate(to)),
        listCategorySpendEvents(user.id, isoDate(prevFrom), isoDate(prevTo))
      ]);

      const currentTotals = sumByCategory(currentEvents);
      const previousTotals = sumByCategory(previousEvents);
      const message = formatDashboardMessage(currentTotals, previousTotals, isoDate(from), isoDate(to));

      await sendViaPreferredChannel(user, prefs, message);
    } catch (error) {
      console.error(`[spending-dashboard] failed for user ${user.id}:`, (error as Error).message);
    }
  }
}
