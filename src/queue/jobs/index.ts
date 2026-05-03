import { refreshConsumablePatterns, sendConsumableReorderNudges } from "../../skills/consumable-tracker/index.js";
import { runDeadlineWatchSkill } from "../../skills/deadline-watch/index.js";
import { runGmailScannerSkill } from "../../skills/gmail-scanner/index.js";
import { runSpendingDashboardSkill } from "../../skills/spending-dashboard/index.js";
import { runSubManagerPromptSkill } from "../../skills/sub-manager/index.js";

export async function runDeadlineWatchJob(): Promise<void> {
  await runDeadlineWatchSkill();
}

export async function runSubManagerJob(): Promise<void> {
  await runSubManagerPromptSkill();
}

export async function runConsumableTrackerJob(): Promise<void> {
  await refreshConsumablePatterns();
  await sendConsumableReorderNudges();
}

export async function runGmailScannerJob(): Promise<void> {
  await runGmailScannerSkill();
}

export async function runSpendingDashboardJob(): Promise<void> {
  await runSpendingDashboardSkill();
}
