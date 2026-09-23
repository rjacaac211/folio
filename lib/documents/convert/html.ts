import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import type { DocumentContent } from "../content";
import { createEmptyDocument, isDocumentContent } from "../content";

/**
 * Parses HTML into the document shape, using the same schema the editor uses.
 *
 * Running the conversion through TipTap's own schema rather than a bespoke
 * parser means anything it cannot represent — scripts, styles, iframes, unknown
 * attributes — is dropped rather than carried into the database. Imported files
 * are untrusted input, so that filtering is the point, not a side effect.
 */
export function htmlToDocument(html: string): DocumentContent {
  const json: unknown = generateJSON(html, [StarterKit]);
  if (!isDocumentContent(json)) return createEmptyDocument();
  // An empty body parses to a doc with no children, which the editor renders as
  // a blank page with no place to put the cursor.
  if (!json.content || json.content.length === 0) return createEmptyDocument();
  return json;
}
