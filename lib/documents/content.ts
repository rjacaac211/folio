/**
 * Folio stores document content as TipTap (ProseMirror) JSON in a jsonb column.
 *
 * These types are deliberately structural rather than an exhaustive union of
 * every node TipTap can emit: the editor's extension set may grow, and the
 * server should persist a new node type without needing a code change. What
 * the server does insist on is that the payload is *shaped* like a document,
 * which `isDocumentContent` checks before anything is written.
 */

export type Mark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type DocumentNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocumentNode[];
  marks?: Mark[];
  text?: string;
};

export type DocumentContent = {
  type: "doc";
  content?: DocumentNode[];
};

/**
 * Guards against pathologically nested payloads. Deeply nested JSON is cheap to
 * send and expensive to walk, so the depth is capped well above anything a real
 * document reaches (nested lists rarely exceed ~10).
 */
export const MAX_CONTENT_DEPTH = 100;

/** Block nodes whose text forms one line of plain-text output. */
const TEXT_BLOCKS = new Set(["paragraph", "heading", "codeBlock"]);

export function createEmptyDocument(): DocumentContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMark(value: unknown): value is Mark {
  return isPlainObject(value) && typeof value.type === "string" && value.type !== "";
}

function isNode(value: unknown, depth: number): value is DocumentNode {
  if (depth > MAX_CONTENT_DEPTH) return false;
  if (!isPlainObject(value)) return false;
  if (typeof value.type !== "string" || value.type === "") return false;
  if (value.text !== undefined && typeof value.text !== "string") return false;
  if (value.attrs !== undefined && !isPlainObject(value.attrs)) return false;
  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks) || !value.marks.every(isMark)) return false;
  }
  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) return false;
    if (!value.content.every((child) => isNode(child, depth + 1))) return false;
  }
  return true;
}

/**
 * Validates an untrusted payload before it is persisted. Every write path calls
 * this, so a malformed body is rejected at the edge rather than corrupting a
 * document that the editor later fails to load.
 */
export function isDocumentContent(value: unknown): value is DocumentContent {
  if (!isPlainObject(value)) return false;
  if (value.type !== "doc") return false;
  if (value.content === undefined) return true;
  if (!Array.isArray(value.content)) return false;
  return value.content.every((node) => isNode(node, 1));
}

function nodeText(node: DocumentNode): string {
  if (typeof node.text === "string") return node.text;
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(nodeText).join("");
}

/**
 * Flattens a document to plain text, one line per block. Used for the plain-text
 * export and for list excerpts.
 */
export function documentToPlainText(content: DocumentContent): string {
  const lines: string[] = [];

  const visit = (node: DocumentNode): void => {
    if (TEXT_BLOCKS.has(node.type)) {
      lines.push(nodeText(node));
      return;
    }
    if (node.content) {
      node.content.forEach(visit);
    } else if (typeof node.text === "string") {
      lines.push(node.text);
    }
  };

  (content.content ?? []).forEach(visit);

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Collapses whitespace and truncates on a whole word, adding an ellipsis. */
export function summarizeText(text: string, maxLength = 160): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  const clipped = collapsed.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd() + "…";
}

/** Single-line preview for document cards. */
export function documentExcerpt(content: DocumentContent, maxLength = 160): string {
  return summarizeText(documentToPlainText(content), maxLength);
}
