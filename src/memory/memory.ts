import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type Prefs = {
  alertTimingDays: number;
  preferredChannel: "whatsapp" | "telegram";
  focusCategories: string[];
  weeklyDigestDay?: "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
  telegramChatId?: string;
};

export type ProductPattern = {
  productName: string;
  reorderIntervalDays: number;
};

export type SubscriptionPattern = {
  subscriptionName: string;
  cycle: "monthly" | "quarterly" | "yearly" | "custom";
  cycleDays?: number;
};

export type SpendingBaseline = {
  category: string;
  monthlyBudget: number;
};

export type Patterns = {
  reorderIntervals: ProductPattern[];
  subscriptions: SubscriptionPattern[];
  spendingBaselines: SpendingBaseline[];
};

export type GmailState = {
  processedIds: string[];
};

const MEMORY_ROOT = path.resolve("src/memory/users");

function getPrefsPath(phone: string): string {
  return path.join(MEMORY_ROOT, phone, "prefs.yaml");
}

function getPatternsPath(phone: string): string {
  return path.join(MEMORY_ROOT, phone, "patterns.yaml");
}

function getGmailStatePath(phone: string): string {
  return path.join(MEMORY_ROOT, phone, "gmail-state.yaml");
}

async function readYamlFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return yaml.load(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeYamlFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const raw = yaml.dump(data, { noRefs: true, lineWidth: 120 });
  await fs.writeFile(filePath, raw, "utf8");
}

export async function readPrefs(phone: string): Promise<Prefs | null> {
  return readYamlFile<Prefs>(getPrefsPath(phone));
}

export async function writePrefs(phone: string, prefs: Prefs): Promise<void> {
  await writeYamlFile(getPrefsPath(phone), prefs);
}

export async function readPatterns(phone: string): Promise<Patterns | null> {
  return readYamlFile<Patterns>(getPatternsPath(phone));
}

export async function writePatterns(phone: string, patterns: Patterns): Promise<void> {
  await writeYamlFile(getPatternsPath(phone), patterns);
}

export async function readGmailState(phone: string): Promise<GmailState | null> {
  return readYamlFile<GmailState>(getGmailStatePath(phone));
}

export async function writeGmailState(phone: string, gmailState: GmailState): Promise<void> {
  await writeYamlFile(getGmailStatePath(phone), gmailState);
}
