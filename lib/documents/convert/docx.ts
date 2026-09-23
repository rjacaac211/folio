import mammoth from "mammoth";
import type { DocumentContent } from "../content";
import { htmlToDocument } from "./html";

/**
 * Converts a .docx file into the document shape.
 *
 * mammoth maps Word's *semantic* styles — Heading 1, List Paragraph, bold runs —
 * onto HTML, rather than trying to reproduce Word's visual formatting. That
 * matches what this editor can represent, so structure survives and everything
 * else is discarded cleanly.
 *
 * Images are intentionally dropped: the editor has no image node, so embedding
 * them would produce content the editor could not render or round-trip.
 */
export async function docxToDocument(buffer: Buffer): Promise<DocumentContent> {
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
  );
  return htmlToDocument(html);
}
