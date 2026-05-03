export function parseRupees(str: string): number {
  const cleaned = str.replace(/[₹,\s]/g, "");
  const value = parseFloat(cleaned);
  if (isNaN(value)) {
    throw new Error(`Cannot parse rupee amount: ${str}`);
  }
  return value;
}

export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function stripGST(totalWithGST: number, gstPercent: number): number {
  return totalWithGST / (1 + gstPercent / 100);
}
