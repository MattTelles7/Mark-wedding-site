const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Format an ISO/timestamp string for display.
 * Returns `fallback` (default: "Not submitted") when value is null/empty.
 */
export function formatDate(
  value: string | null | undefined,
  fallback = "Not submitted",
): string {
  if (!value) return fallback;

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}
