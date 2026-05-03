export function parseIndianDate(ddmmyyyy: string): Date {
  const parts = ddmmyyyy.split("/");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${ddmmyyyy}. Expected DD/MM/YYYY`);
  }
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysFromNow(date: Date): number {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** DD/MM/YYYY from ingestion, or YYYY-MM-DD from Supabase `date` column. */
function parsePurchaseDateForDeadline(input: string): Date {
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return parseIndianDate(input);
}

export function formatDeadline(
  purchaseDate: string,
  deadlineDays: number
): string {
  const purchase = parsePurchaseDateForDeadline(purchaseDate);
  const deadline = addDays(purchase, deadlineDays);
  return deadline.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
