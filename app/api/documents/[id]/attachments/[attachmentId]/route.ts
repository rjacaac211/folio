import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import { deleteAttachment, readAttachment } from "@/lib/attachments/storage";
import { prisma } from "@/lib/db";
import { errorResponse, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

/**
 * Streams an attachment back to the browser.
 *
 * This route exists because attachments are stored privately and have no public
 * URL. Every download re-runs the document's authorization check, so losing
 * access to a document immediately closes its attachments too — which a public
 * URL could not do, since anyone holding the link would keep it forever.
 *
 * The attachment is looked up scoped to the document in the path, so an id
 * belonging to a different document cannot be fetched through a document the
 * caller happens to have access to.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id, attachmentId } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to download this file.");

    await requireDocumentAccess(id, user.id, "read");

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, documentId: id },
      select: { filename: true, mimeType: true, pathname: true },
    });
    if (!attachment) return errorResponse(404, "Attachment not found.");

    const stored = await readAttachment(attachment.pathname);
    if (!stored) return errorResponse(404, "That file is no longer in storage.");

    // The filename was sanitised before it was stored, so it is safe to place in
    // the header. It is quoted for names containing spaces.
    return new Response(stored.stream, {
      headers: {
        "content-type": attachment.mimeType,
        "content-disposition": `attachment; filename="${attachment.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Removes an attachment. Requires write access on the document.
 *
 * The blob is deleted before the row: a missing blob with a surviving row would
 * show a broken download, whereas an orphaned blob is invisible and cheap. If
 * blob deletion fails the row is kept, so the attachment can be retried rather
 * than disappearing from the interface while its bytes remain.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id, attachmentId } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to remove this file.");

    await requireDocumentAccess(id, user.id, "write");

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, documentId: id },
      select: { id: true, pathname: true },
    });
    if (!attachment) return errorResponse(404, "Attachment not found.");

    await deleteAttachment(attachment.pathname);
    await prisma.attachment.delete({ where: { id: attachment.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
