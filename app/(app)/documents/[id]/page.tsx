import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { AccessDeniedError, requireDocumentAccess } from "@/lib/authz";
import { isDocumentContent, documentToPlainText } from "@/lib/documents/content";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  let access;
  try {
    access = await requireDocumentAccess(id, user.id, "read");
  } catch (error) {
    // A document that does not exist and one this user may not see are
    // indistinguishable here, which is the intent.
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }

  const { document, role } = access;
  const body = isDocumentContent(document.content) ? documentToPlainText(document.content) : "";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Link
        href="/documents"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        All documents
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{document.title}</h1>
        <Badge variant="secondary">{ROLE_LABEL[role]}</Badge>
      </div>

      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        <UserAvatar user={document.owner} className="size-5" />
        <span>{document.owner.name}</span>
        <span aria-hidden>·</span>
        <span>Updated {formatRelativeTime(document.updatedAt)}</span>
      </div>

      <article className="bg-card mt-6 rounded-xl border p-8 shadow-sm">
        {body ? (
          <pre className="font-sans text-sm leading-7 whitespace-pre-wrap">{body}</pre>
        ) : (
          <p className="text-muted-foreground text-sm">This document is empty.</p>
        )}
      </article>

      <p className="text-muted-foreground mt-4 text-xs">
        Read-only preview. Rich-text editing arrives with the editor.
      </p>
    </main>
  );
}
