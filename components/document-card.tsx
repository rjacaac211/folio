import Link from "next/link";
import { FileText } from "lucide-react";
import type { DocumentSummary } from "@/lib/documents/queries";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeTime } from "@/lib/format";

export function DocumentCard({ document }: { document: DocumentSummary }) {
  return (
    <Link
      href={`/documents/${document.id}`}
      className="group bg-card hover:border-foreground/20 focus-visible:ring-ring flex flex-col rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="text-muted-foreground size-4 shrink-0" />
          <h3 className="truncate text-sm font-medium">{document.title}</h3>
        </div>
        {document.sharedRole ? (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {document.sharedRole === "EDITOR" ? "Editor" : "Viewer"}
          </Badge>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5">
        {document.excerpt || "Empty document"}
      </p>

      <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
        <UserAvatar user={document.owner} className="size-5" />
        <span className="truncate">{document.owner.name}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{formatRelativeTime(document.updatedAt)}</span>
      </div>
    </Link>
  );
}
