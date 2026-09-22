import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { can, denialStatus, roleFor, type Capability, type DocumentRole } from "./policy";

export * from "./policy";

/**
 * Thrown when a request may not proceed. Carries the status the caller should
 * return, which `denialStatus` decides — 404 to hide a document's existence from
 * someone with no access, 403 for someone who can already see it.
 */
export class AccessDeniedError extends Error {
  constructor(readonly status: 403 | 404) {
    super(status === 404 ? "Document not found" : "Insufficient permissions");
    this.name = "AccessDeniedError";
  }
}

const DOCUMENT_WITH_ACCESS = {
  id: true,
  title: true,
  content: true,
  version: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true, avatarColor: true } },
  shares: {
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, avatarColor: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

export type DocumentWithAccess = Prisma.DocumentGetPayload<{
  select: typeof DOCUMENT_WITH_ACCESS;
}>;

export type DocumentAccess = {
  document: DocumentWithAccess;
  role: DocumentRole;
};

/**
 * The single gate every document read and write passes through.
 *
 * Route handlers never inspect `ownerId` or the share rows themselves; they call
 * this and either get an access record or an error carrying the right status.
 * Keeping it in one place is what makes the permission tests meaningful — there
 * is no second code path that could disagree with them.
 */
export async function requireDocumentAccess(
  documentId: string,
  userId: string | null | undefined,
  capability: Capability,
): Promise<DocumentAccess> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: DOCUMENT_WITH_ACCESS,
  });

  // A document that does not exist and one the user may not see are reported
  // identically, on purpose.
  if (!document) throw new AccessDeniedError(404);

  const shares = document.shares.map((share) => ({ userId: share.user.id, role: share.role }));
  const role = roleFor(document, shares, userId);

  if (!can(role, capability)) {
    throw new AccessDeniedError(denialStatus(role));
  }

  return { document, role: role as DocumentRole };
}
