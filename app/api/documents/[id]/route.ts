import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { isDocumentContent } from "@/lib/documents/content";
import { toJsonInput } from "@/lib/documents/json";
import { normalizeTitle } from "@/lib/documents/title";
import { errorResponse, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/**
 * Saves document content.
 *
 * The client sends the version it loaded. The update is conditional on that
 * version still being current, which makes the check-and-write a single atomic
 * statement — two concurrent saves cannot both succeed, even if they arrive at
 * the same instant. A rejected save returns 409 along with the current content,
 * so the client can show what it missed instead of silently discarding work.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to edit this document.");

    await requireDocumentAccess(id, user.id, "write");

    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== "object") {
      return errorResponse(400, "Expected a JSON body.");
    }

    const { content, version } = body as { content?: unknown; version?: unknown };

    if (!Number.isInteger(version)) {
      return errorResponse(400, "A numeric version is required.");
    }
    if (!isDocumentContent(content)) {
      return errorResponse(400, "Document content is malformed.");
    }

    const updated = await prisma.document.updateMany({
      where: { id, version: version as number },
      data: { content: toJsonInput(content), version: { increment: 1 } },
    });

    if (updated.count === 0) {
      const current = await prisma.document.findUnique({
        where: { id },
        select: { content: true, version: true, updatedAt: true },
      });
      return errorResponse(409, "This document was changed somewhere else.", { current });
    }

    const saved = await prisma.document.findUniqueOrThrow({
      where: { id },
      select: { version: true, updatedAt: true },
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Renames a document. Title changes do not bump the content version. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to rename this document.");

    await requireDocumentAccess(id, user.id, "write");

    const body: unknown = await request.json().catch(() => null);
    const title = (body as { title?: unknown } | null)?.title;
    if (typeof title !== "string") {
      return errorResponse(400, "A title is required.");
    }

    const saved = await prisma.document.update({
      where: { id },
      data: { title: normalizeTitle(title) },
      select: { title: true, updatedAt: true },
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Deletes a document. Owner only — shares and attachments cascade. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to delete this document.");

    await requireDocumentAccess(id, user.id, "delete");
    await prisma.document.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
