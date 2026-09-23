"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ATTACHMENT_SUMMARY,
  formatBytes,
  MAX_ATTACHMENTS_PER_DOCUMENT,
} from "@/lib/attachments/limits";
import { formatRelativeTime } from "@/lib/format";

export type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string };
};

/**
 * Attachments for a document.
 *
 * Downloads go through the app rather than a storage URL, because the files are
 * stored privately: every request re-runs the document's access check, so
 * revoking someone's access closes the attachments with it.
 */
export function AttachmentPanel({
  documentId,
  initialAttachments,
  canEdit,
  storageEnabled,
}: {
  documentId: string;
  initialAttachments: Attachment[];
  canEdit: boolean;
  storageEnabled: boolean;
}) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const atLimit = attachments.length >= MAX_ATTACHMENTS_PER_DOCUMENT;

  async function upload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch(`/api/documents/${documentId}/attachments`, {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as
        (Attachment & { error?: string }) | null;

      if (!response.ok || !payload?.id) {
        toast.error(payload?.error ?? "That file could not be attached.");
        return;
      }

      setAttachments((current) => [...current, payload]);
      toast.success(`Attached ${payload.filename}`);
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(attachment: Attachment) {
    setRemoving(attachment.id);
    try {
      const response = await fetch(`/api/documents/${documentId}/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(payload?.error ?? "Could not remove that file.");
        return;
      }
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section data-print-hidden className="mx-auto mt-6 w-full max-w-3xl">
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="size-4" />
            Attachments
            <span className="text-muted-foreground font-normal">({attachments.length})</span>
          </h2>

          {canEdit ? (
            <>
              <input
                ref={input}
                type="file"
                accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading || atLimit || !storageEnabled}
                onClick={() => input.current?.click()}
                title={
                  !storageEnabled
                    ? "File storage is not configured on this deployment"
                    : atLimit
                      ? `A document can have at most ${MAX_ATTACHMENTS_PER_DOCUMENT} attachments`
                      : undefined
                }
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Attach
              </Button>
            </>
          ) : null}
        </div>

        {attachments.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-xs">
            {canEdit
              ? storageEnabled
                ? `No files yet. ${ATTACHMENT_SUMMARY}.`
                : "File storage is not configured on this deployment, so attachments are unavailable."
              : "No files attached to this document."}
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{attachment.filename}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(attachment.size)} · {attachment.uploadedBy.name} ·{" "}
                    {formatRelativeTime(attachment.createdAt)}
                  </p>
                </div>

                <a
                  href={`/api/documents/${documentId}/attachments/${attachment.id}`}
                  className="text-muted-foreground hover:text-foreground rounded p-1.5"
                  aria-label={`Download ${attachment.filename}`}
                >
                  <Download className="size-4" />
                </a>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void remove(attachment)}
                    disabled={removing === attachment.id}
                    aria-label={`Remove ${attachment.filename}`}
                    className="text-muted-foreground hover:text-destructive rounded p-1.5 disabled:opacity-50"
                  >
                    {removing === attachment.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
