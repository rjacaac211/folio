import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import { MAX_ATTACHMENT_BYTES } from "@/lib/attachments/limits";
import { isStorageConfigured, storeAttachment } from "@/lib/attachments/storage";
import { checkAttachment } from "@/lib/attachments/validate";
import { prisma } from "@/lib/db";
import { errorResponse, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const ATTACHMENT_FIELDS = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

/** Lists a document's attachments. Requires read access. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to view attachments.");

    await requireDocumentAccess(id, user.id, "read");

    const attachments = await prisma.attachment.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "asc" },
      select: ATTACHMENT_FIELDS,
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Attaches a file to a document.
 *
 * Requires write access, not merely read: someone who can only view a document
 * should not be able to add content to it.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to attach a file.");

    await requireDocumentAccess(id, user.id, "write");

    if (!isStorageConfigured()) {
      return errorResponse(
        503,
        "File storage is not configured on this deployment, so attachments are unavailable.",
      );
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return errorResponse(400, "Attach a file to upload.");
    }

    // Checked before the body is read into memory, so an oversized upload is
    // refused rather than buffered.
    if (file.size > MAX_ATTACHMENT_BYTES) {
      const limit = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
      return errorResponse(413, `Attachments must be ${limit} MB or smaller.`);
    }

    const existingCount = await prisma.attachment.count({ where: { documentId: id } });
    const check = checkAttachment(file.name, file.size, existingCount);
    if (!check.ok) {
      return errorResponse(check.status, check.error);
    }

    const stored = await storeAttachment(
      id,
      check.filename,
      check.contentType,
      Buffer.from(await file.arrayBuffer()),
    );

    const attachment = await prisma.attachment.create({
      data: {
        documentId: id,
        filename: check.filename,
        mimeType: check.contentType,
        size: stored.size,
        // Attachments are private, so there is no public URL. Reads go through
        // the download route, which repeats the authorization check.
        url: "",
        pathname: stored.pathname,
        uploadedById: user.id,
      },
      select: ATTACHMENT_FIELDS,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
