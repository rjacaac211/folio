import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { errorResponse, handleRouteError } from "@/lib/http";
import { isShareRole } from "@/lib/sharing/validate";

type Params = { params: Promise<{ id: string; userId: string }> };

/** Changes someone's role. Owner only. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to change sharing.");

    await requireDocumentAccess(id, user.id, "share");

    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    if (!isShareRole(body?.role)) {
      return errorResponse(400, "Choose either Viewer or Editor.");
    }

    const existing = await prisma.share.findUnique({
      where: { documentId_userId: { documentId: id, userId } },
      select: { userId: true },
    });
    if (!existing) return errorResponse(404, "That person does not have access.");

    const share = await prisma.share.update({
      where: { documentId_userId: { documentId: id, userId } },
      data: { role: body.role },
      select: {
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
    });

    return NextResponse.json(share);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Revokes access. Owner only.
 *
 * Takes effect on the next request rather than needing any cleanup: access is
 * resolved from the share rows on every read, so removing the row is the whole
 * operation — including for the document's attachments, which are served through
 * the same check.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id, userId } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to change sharing.");

    await requireDocumentAccess(id, user.id, "share");

    const removed = await prisma.share.deleteMany({
      where: { documentId: id, userId },
    });

    if (removed.count === 0) {
      return errorResponse(404, "That person does not have access.");
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
