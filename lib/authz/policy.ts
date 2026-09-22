/**
 * The entire permission model, as pure functions.
 *
 * Nothing here touches the database or a request, which is deliberate: these are
 * the rules that decide who may read and change a document, so they should be
 * cheap to read and exhaustively testable on their own. The database lookup that
 * feeds them lives in ./index.ts.
 */

export type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

export type Capability = "read" | "write" | "share" | "delete";

type OwnedDocument = { ownerId: string };
type GrantedShare = { userId: string; role: "VIEWER" | "EDITOR" };

const CAPABILITIES: Record<DocumentRole, ReadonlySet<Capability>> = {
  OWNER: new Set<Capability>(["read", "write", "share", "delete"]),
  EDITOR: new Set<Capability>(["read", "write"]),
  VIEWER: new Set<Capability>(["read"]),
};

/**
 * The role a user holds on a document, or null if they have none.
 * Ownership wins: an owner who also has a share row is still the owner.
 */
export function roleFor(
  document: OwnedDocument,
  shares: readonly GrantedShare[],
  userId: string | null | undefined,
): DocumentRole | null {
  if (!userId) return null;
  if (document.ownerId === userId) return "OWNER";
  const share = shares.find((candidate) => candidate.userId === userId);
  return share ? share.role : null;
}

/** Whether a role permits a capability. A null role permits nothing. */
export function can(role: DocumentRole | null, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITIES[role].has(capability);
}

/**
 * How a denied request should be reported.
 *
 * A user with no role learns nothing: the document reads as "not found", so the
 * API cannot be used to discover which document ids exist. Someone who *can*
 * already see the document gets a truthful 403 instead — they know it exists, so
 * hiding it would only be confusing.
 */
export function denialStatus(role: DocumentRole | null): 404 | 403 {
  return role === null ? 404 : 403;
}
