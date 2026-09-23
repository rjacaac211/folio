import type { DocumentContent } from "../content";
import { deriveTitleFromFilename, extensionOf } from "../title";
import { IMPORT_EXTENSIONS, MAX_IMPORT_BYTES } from "./formats";
import { docxToDocument } from "./docx";
import { markdownToDocument } from "./markdown";
import { textToDocument } from "./text";

export * from "./formats";
export { documentToMarkdown, markdownToDocument } from "./markdown";
export { htmlToDocument } from "./html";
export { textToDocument } from "./text";

export type ImportFailure = { ok: false; status: 400 | 413 | 415; error: string };
export type ImportSuccess = { ok: true; title: string; content: DocumentContent };
export type ImportResult = ImportSuccess | ImportFailure;

/** A .docx is a zip archive, which always begins with the local file header. */
function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * Rejects binary content masquerading as text. A NUL byte in the first few
 * kilobytes is the cheap, reliable signal — no plain-text or markdown file
 * contains one, and most binary formats do.
 */
function looksBinary(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 4096);
  return sample.includes(0);
}

/**
 * Converts an uploaded file into a document, or explains why it cannot.
 *
 * The file's declared type is not trusted: the extension selects a decoder, but
 * the bytes are checked against it, so renaming `payload.exe` to `notes.md` is
 * rejected rather than stored. Returns a result rather than throwing so the route
 * can map each failure to a status without a try/catch ladder.
 */
export async function importFile(filename: string, bytes: Uint8Array): Promise<ImportResult> {
  if (bytes.byteLength === 0) {
    return { ok: false, status: 400, error: "That file is empty." };
  }

  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    const limit = Math.round(MAX_IMPORT_BYTES / (1024 * 1024));
    return { ok: false, status: 413, error: `Files must be ${limit} MB or smaller.` };
  }

  const kind = IMPORT_EXTENSIONS[extensionOf(filename)];
  if (!kind) {
    return {
      ok: false,
      status: 415,
      error: "Only .txt, .md and .docx files can be imported.",
    };
  }

  const title = deriveTitleFromFilename(filename);

  if (kind === "docx") {
    if (!looksLikeZip(bytes)) {
      return { ok: false, status: 415, error: "That file is not a valid .docx document." };
    }
    try {
      return { ok: true, title, content: await docxToDocument(Buffer.from(bytes)) };
    } catch {
      return { ok: false, status: 400, error: "That .docx file could not be read." };
    }
  }

  if (looksBinary(bytes)) {
    return { ok: false, status: 415, error: "That file does not appear to be text." };
  }

  const text = new TextDecoder("utf-8").decode(bytes);
  const content = kind === "md" ? markdownToDocument(text) : textToDocument(text);

  return { ok: true, title, content };
}
