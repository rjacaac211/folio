import { prisma } from "@/lib/db";
import { documentToPlainText, isDocumentContent, summarizeText } from "./content";

export type DocumentSummary = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
  owner: { id: string; name: string; email: string; avatarColor: string };
  /** Present only for documents shared with the current user. */
  sharedRole?: "VIEWER" | "EDITOR";
  shareCount: number;
};

const SUMMARY_SELECT = {
  id: true,
  title: true,
  content: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true, avatarColor: true } },
  _count: { select: { shares: true } },
} as const;

/**
 * Preview text for a document card.
 *
 * Content is validated rather than asserted, so a row written by an older
 * version of the app degrades to a blank excerpt instead of crashing the list.
 * Documents usually open with a heading repeating their own title, which would
 * make every card read "Q3 Planning — Q3 Planning ...", so that prefix is dropped.
 */
function buildExcerpt(content: unknown, title: string): string {
  if (!isDocumentContent(content)) return "";
  const text = documentToPlainText(content);
  const body = text.startsWith(title) ? text.slice(title.length) : text;
  return summarizeText(body);
}

function toSummary(
  row: {
    id: string;
    title: string;
    content: unknown;
    updatedAt: Date;
    owner: { id: string; name: string; email: string; avatarColor: string };
    _count: { shares: number };
  },
  sharedRole?: "VIEWER" | "EDITOR",
): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    excerpt: buildExcerpt(row.content, row.title),
    updatedAt: row.updatedAt,
    owner: row.owner,
    shareCount: row._count.shares,
    ...(sharedRole ? { sharedRole } : {}),
  };
}

/** Documents the user owns, most recently edited first. */
export async function listOwnedDocuments(userId: string): Promise<DocumentSummary[]> {
  const rows = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: SUMMARY_SELECT,
  });
  return rows.map((row) => toSummary(row));
}

/** Documents someone else owns and has shared with the user. */
export async function listSharedDocuments(userId: string): Promise<DocumentSummary[]> {
  const rows = await prisma.share.findMany({
    where: { userId },
    orderBy: { document: { updatedAt: "desc" } },
    select: { role: true, document: { select: SUMMARY_SELECT } },
  });
  return rows.map((row) => toSummary(row.document, row.role));
}
