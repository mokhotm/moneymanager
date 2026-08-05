/**
 * Currency and number formatting utilities.
 * Spec §5: ZAR, R prefix, comma thousands separator, period decimal.
 * e.g. R 74,467.00
 *
 * All formatters accept `number | null | undefined` and gracefully return
 * a placeholder so the UI never shows "undefined" or "NaN".
 */

const ZAR_FORMAT = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as ZAR currency: R 74,467.00
 */
export function formatZAR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R 0.00";
  // en-ZA uses R prefix with a space
  return ZAR_FORMAT.format(value);
}

/**
 * Format a number as ZAR with sign for margins (positive = green, negative = red).
 * e.g. +R 1,234.00 or -R 456.00
 */
export function formatZARSigned(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R 0.00";
  const prefix = value >= 0 ? "+" : "";
  return prefix + formatZAR(value);
}

/**
 * Format a decimal percentage: 0.21 → "21.00%"
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "—";
  return (value * 100).toFixed(2) + "%";
}

/**
 * Format months as "X months" or "X yrs Y months" for readability.
 */
export function formatMonths(months: number | null | undefined): string {
  if (months == null || isNaN(months)) return "—";
  if (months === 0) return "Paid off";
  if (months >= 600) return "Never clears at this rate";
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (remainder === 0) return `${years} yr${years !== 1 ? "s" : ""}`;
  return `${years} yr${years !== 1 ? "s" : ""} ${remainder} mo`;
}

/**
 * Current month as "YYYY-MM" string.
 */
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format a date as "DD MMM YYYY"
 */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
