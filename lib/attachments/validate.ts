import { basename, extensionOf } from "@/lib/documents/title";
import { ALLOWED_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_DOCUMENT } from "./limits";

export type AttachmentRejection = { ok: false; status: 400 | 409 | 413 | 415; error: string };
export type AttachmentAcceptance = { ok: true; filename: string; contentType: string };
export type AttachmentCheck = AttachmentAcceptance | AttachmentRejection;

/** Control characters, which could inject extra lines into a response header. */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/** Quotes and backslashes, which would terminate a Content-Disposition filename. */
const HEADER_BREAKING = /["\\]/g;

/**
 * Strips characters that would let a filename escape its directory or confuse a
 * Content-Disposition header. The stored name is ours, not the uploader's.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = basename(name)
    .replace(CONTROL_CHARACTERS, "")
    .replace(HEADER_BREAKING, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned === "" || cleaned === "." || cleaned === ".." ? "file" : cleaned.slice(0, 120);
}

/**
 * Decides whether an upload may be stored.
 *
 * The extension allowlist is the gate, and the browser-supplied media type is
 * ignored entirely — it is trivially forged, and trusting it is how a .html ends
 * up stored as an image. The type recorded is the one the allowlist says the
 * extension means.
 */
export function checkAttachment(
  filename: string,
  size: number,
  existingCount: number,
): AttachmentCheck {
  if (existingCount >= MAX_ATTACHMENTS_PER_DOCUMENT) {
    return {
      ok: false,
      status: 409,
      error: `A document can have at most ${MAX_ATTACHMENTS_PER_DOCUMENT} attachments.`,
    };
  }

  if (size === 0) {
    return { ok: false, status: 400, error: "That file is empty." };
  }

  if (size > MAX_ATTACHMENT_BYTES) {
    const limit = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
    return { ok: false, status: 413, error: `Attachments must be ${limit} MB or smaller.` };
  }

  const contentType = ALLOWED_ATTACHMENTS[extensionOf(filename)];
  if (!contentType) {
    return { ok: false, status: 415, error: "That file type cannot be attached." };
  }

  return { ok: true, filename: sanitizeFilename(filename), contentType };
}
