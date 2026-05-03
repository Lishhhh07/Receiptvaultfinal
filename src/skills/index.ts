import { runHelloWorldSkill, type SkillContext, type SkillResponse } from "./hello-world/index.js";
import { refreshConsumablePatterns, sendConsumableReorderNudges } from "./consumable-tracker/index.js";
import { runDeadlineWatchSkill } from "./deadline-watch/index.js";
import { runGmailScannerSkill } from "./gmail-scanner/index.js";
import { runSpendingDashboardSkill } from "./spending-dashboard/index.js";
import { runSubManagerPromptSkill } from "./sub-manager/index.js";

export type SkillHandler = (input: SkillContext) => SkillResponse;

const skillRegistry = new Map<string, SkillHandler>([["hello-world", runHelloWorldSkill]]);

export function runSkill(name: string, input: SkillContext): SkillResponse {
  const skill = skillRegistry.get(name);
  if (!skill) {
    return { message: `Unknown skill: ${name}` };
  }
  return skill(input);
}

export function listSkills(): string[] {
  return [
    ...Array.from(skillRegistry.keys()),
    "deadline-watch",
    "sub-manager",
    "gmail-scanner",
    "consumable-tracker",
    "spending-dashboard"
  ];
}

export async function runRegisteredSkill(name: string): Promise<void> {
  if (name === "deadline-watch") return runDeadlineWatchSkill();
  if (name === "sub-manager") return runSubManagerPromptSkill();
  if (name === "gmail-scanner") return runGmailScannerSkill();
  if (name === "consumable-tracker") {
    await refreshConsumablePatterns();
    await sendConsumableReorderNudges();
    return;
  }
  if (name === "spending-dashboard") return runSpendingDashboardSkill();
  throw new Error(`Unknown async skill: ${name}`);
}
