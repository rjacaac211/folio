import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import {
  createEmptyDocument,
  documentToPlainText,
  isDocumentContent,
  type DocumentContent,
} from "@/lib/documents/content";
import { documentToMarkdown } from "@/lib/documents/convert";
import { errorResponse, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const FORMATS = {
  md: { extension: "md", contentType: "text/markdown; charset=utf-8" },
  txt: { extension: "txt", contentType: "text/plain; charset=utf-8" },
} as const;

type Format = keyof typeof FORMATS;

/**
 * Most documents open with a heading repeating their own title. Prepending the
 * title unconditionally would print it twice, so it is only added when the body
 * does not already lead with it.
 */
function startsWithTitle(content: DocumentContent, title: string): boolean {
  const first = content.content?.[0];
  if (!first || first.type !== "heading") return false;
  const text = (first.content ?? []).map((node) => node.text ?? "").join("");
  return text.trim() === title.trim();
}

/** Replaces characters that are awkward or unsafe in a downloaded filename. */
function safeFilename(title: string, extension: string): string {
  const base = title.replace(/[^\w\-. ]+/g, "").trim() || "document";
  return `${base}.${extension}`;
}

/**
 * Exports a document as Markdown or plain text.
 *
 * Export requires read access, which means the same 404-for-strangers rule
 * applies here as everywhere else — a document cannot be extracted through a
 * route that forgot to ask.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to export this document.");

    const format = new URL(request.url).searchParams.get("format") ?? "md";
    if (!(format in FORMATS)) {
      return errorResponse(400, "Supported formats are md and txt.");
    }
    const { extension, contentType } = FORMATS[format as Format];

    const { document } = await requireDocumentAccess(id, user.id, "read");
    const content = isDocumentContent(document.content) ? document.content : createEmptyDocument();

    const hasTitle = startsWithTitle(content, document.title);
    const body =
      format === "md"
        ? hasTitle
          ? documentToMarkdown(content)
          : `# ${document.title}\n\n${documentToMarkdown(content)}`
        : hasTitle
          ? `${documentToPlainText(content)}\n`
          : `${document.title}\n\n${documentToPlainText(content)}\n`;

    return new Response(body, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${safeFilename(document.title, extension)}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
