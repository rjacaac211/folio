import { FileText, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listOwnedDocuments, listSharedDocuments } from "@/lib/documents/queries";
import { DocumentCard } from "@/components/document-card";
import type { DocumentSummary } from "@/lib/documents/queries";

export const metadata = { title: "Documents — Folio" };

// Document lists reflect writes that just happened, so they are never cached.
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requireUser();
  const [owned, shared] = await Promise.all([
    listOwnedDocuments(user.id),
    listSharedDocuments(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Documents</h1>

      <Section
        title="My documents"
        icon={<FileText className="size-4" />}
        documents={owned}
        empty="You have not created any documents yet."
      />

      <Section
        title="Shared with me"
        icon={<Users className="size-4" />}
        documents={shared}
        empty="Nothing has been shared with you yet."
      />
    </main>
  );
}

function Section({
  title,
  icon,
  documents,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  documents: DocumentSummary[];
  empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        {icon}
        {title}
        <span className="text-muted-foreground/60 font-normal">({documents.length})</span>
      </h2>

      {documents.length === 0 ? (
        <p className="text-muted-foreground mt-3 rounded-xl border border-dashed p-6 text-center text-sm">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <li key={document.id}>
              <DocumentCard document={document} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
