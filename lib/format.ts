const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative time for document lists ("3m ago", "yesterday").
 *
 * Rendered on the server, so `now` is injectable to keep the output
 * deterministic in tests rather than depending on the clock.
 */
export function formatRelativeTime(value: Date | string, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const elapsed = now.getTime() - date.getTime();

  if (Number.isNaN(elapsed)) return "";
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 2 * DAY) return "yesterday";
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
