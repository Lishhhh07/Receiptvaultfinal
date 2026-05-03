import test from "node:test";
import assert from "node:assert/strict";
import { handleSubscriptionReply } from "../skills/sub-manager/index.js";
import { computeAverageReorderIntervals } from "../skills/consumable-tracker/index.js";
import { formatDashboardMessage, sumByCategory } from "../skills/spending-dashboard/index.js";
import { normalizeParsedReceipt } from "../skills/gmail-scanner/index.js";

test("sub-manager reply parser rejects invalid payloads", async () => {
  const msg = await handleSubscriptionReply("maybe later");
  assert.match(msg, /Please reply in format/);
});

test("consumable tracker computes average reorder interval", () => {
  const intervals = computeAverageReorderIntervals([
    { item_name: "Milk", receipt_date: "2026-04-01" },
    { item_name: "Milk", receipt_date: "2026-04-04" },
    { item_name: "Milk", receipt_date: "2026-04-10" }
  ]);
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0]?.productName, "Milk");
  assert.equal(intervals[0]?.reorderIntervalDays, 5);
});

test("spending dashboard formatter includes totals", () => {
  const current = sumByCategory([
    { category: "groceries", amount: 1000 },
    { category: "household", amount: 200 }
  ]);
  const previous = sumByCategory([{ category: "groceries", amount: 700 }]);
  const message = formatDashboardMessage(current, previous, "2026-04-20", "2026-04-26");
  assert.match(message, /Weekly spending dashboard/);
  assert.match(message, /groceries: Rs 1000.00/);
  assert.match(message, /Grand total: Rs 1200.00/);
});

test("gmail parser normalization drops missing fields", () => {
  assert.equal(normalizeParsedReceipt(null), null);
  assert.equal(normalizeParsedReceipt({ merchant: "A", amount: Number.NaN, date: "2026-01-01" }), null);
  assert.deepEqual(
    normalizeParsedReceipt({ merchant: " Store ", amount: 99.5, date: "2026-01-01" }),
    { merchant: "Store", amount: 99.5, date: "2026-01-01" }
  );
});
