/**
 * Attachment rules, in a module with no server dependencies so client components
 * can display exactly what the server enforces.
 */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_DOCUMENT = 10;

/**
 * Accepted types, mapped from extension to the media type we store.
 *
 * An allowlist rather than a blocklist: anything not named here is refused, so a
 * new dangerous format does not become accepted by omission. Notably absent are
 * HTML and SVG — both can carry scripts, and serving them back from our own
 * origin would let an attachment run code against the app.
 */
export const ALLOWED_ATTACHMENTS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  json: "application/json",
};

export const ATTACHMENT_ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_ATTACHMENTS)
  .map((extension) => `.${extension}`)
  .join(",");

export const ATTACHMENT_SUMMARY = "Images, PDF, Office files, text and zip — up to 5 MB each";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
