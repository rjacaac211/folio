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
 * Strips any directory prefix a browser included with an upload. Both separators
 * are handled because a file picked on Windows can arrive with backslashes.
 */
export function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? "";
}

/** The lowercased extension of a filename, without the dot, or "". */
export function extensionOf(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

/**
 * Turn an uploaded filename into a document title: drop any directory prefix
 * the browser included, drop the extension, then normalize.
 */
export function deriveTitleFromFilename(filename: string): string {
  return normalizeTitle(basename(filename).replace(/\.[^.]+$/, ""));
}
