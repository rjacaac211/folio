import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireDocumentAccess } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { errorResponse, handleRouteError } from "@/lib/http";
import { checkShareRequest } from "@/lib/sharing/validate";

type Params = { params: Promise<{ id: string }> };

const SHARE_FIELDS = {
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatarColor: true } },
} as const;

/**
 * Lists who has access.
 *
 * Read access is enough: people collaborating on a document can reasonably see
 * who else is on it, the same way they can see each other's edits. Changing
 * access is a different matter and requires the share capability.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to view sharing.");

    const { document } = await requireDocumentAccess(id, user.id, "read");

    return NextResponse.json({
      owner: document.owner,
      shares: document.shares,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Grants access to another user.
 *
 * Requires the share capability, which only the owner has — an editor can change
 * a document's contents but not who else can reach it.
 *
 * Granting to someone who already has access updates their role rather than
 * failing. Re-sharing at a different level is the same intent expressed twice,
 * and an error there would just make the caller delete and re-add.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to share this document.");

    const { document } = await requireDocumentAccess(id, user.id, "share");

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      role?: unknown;
    } | null;

    const check = checkShareRequest(body?.email, body?.role);
    if (!check.ok) return errorResponse(check.status, check.error);

    const recipient = await prisma.user.findUnique({
      where: { email: check.email },
      select: { id: true, name: true, email: true, avatarColor: true },
    });

    if (!recipient) {
      return errorResponse(404, `No account found for ${check.email}.`);
    }

    if (recipient.id === document.ownerId) {
      // Without this, an owner could grant themselves VIEWER. roleFor() puts
      // ownership first so it would not actually reduce their access, but the
      // sharing list would show them twice and say something untrue.
      return errorResponse(409, "You already own this document.");
    }

    const share = await prisma.share.upsert({
      where: { documentId_userId: { documentId: id, userId: recipient.id } },
      create: { documentId: id, userId: recipient.id, role: check.role },
      update: { role: check.role },
      select: SHARE_FIELDS,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
