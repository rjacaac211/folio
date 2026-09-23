import type { DocumentContent, DocumentNode } from "../content";
import { createEmptyDocument } from "../content";

/**
 * Turns plain text into paragraphs, one per line.
 *
 * Runs of blank lines collapse into a single break, which is what people expect
 * when pasting text that was hard-wrapped with double newlines.
 */
export function textToDocument(text: string): DocumentContent {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const content: DocumentNode[] = [];
  let lastWasBlank = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      lastWasBlank = true;
      continue;
    }
    if (lastWasBlank && content.length > 0) {
      // Preserve the paragraph break without emitting a run of empty nodes.
      lastWasBlank = false;
    }
    content.push({ type: "paragraph", content: [{ type: "text", text: trimmed }] });
  }

  return content.length === 0 ? createEmptyDocument() : { type: "doc", content };
}
