/**
 * Import limits and accepted types.
 *
 * Kept in a module of its own so client components can show the same rules the
 * server enforces without pulling mammoth and the markdown parser into the
 * browser bundle.
 */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type ImportKind = "txt" | "md" | "docx";

export const IMPORT_EXTENSIONS: Record<string, ImportKind> = {
  txt: "txt",
  text: "txt",
  md: "md",
  markdown: "md",
  docx: "docx",
};

export const IMPORT_ACCEPT_ATTRIBUTE = ".txt,.text,.md,.markdown,.docx";

/** Human-readable summary, shown in the UI and documented in the README. */
export const IMPORT_SUMMARY = ".txt, .md and .docx, up to 2 MB";
