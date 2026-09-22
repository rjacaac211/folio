export const UNTITLED_TITLE = "Untitled document";
export const MAX_TITLE_LENGTH = 120;

/**
 * Collapse whitespace, trim, cap length, and fall back to a default.
 * Applied to every title the app stores, whether typed or derived from a file.
 */
export function normalizeTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned === "") return UNTITLED_TITLE;
  return cleaned.length > MAX_TITLE_LENGTH ? cleaned.slice(0, MAX_TITLE_LENGTH).trimEnd() : cleaned;
}

/**
 * Turn an uploaded filename into a document title: drop any directory prefix
 * the browser included, drop the extension, then normalize.
 */
export function deriveTitleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  return normalizeTitle(base.replace(/\.[^.]+$/, ""));
}
