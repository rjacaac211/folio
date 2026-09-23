"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMPORT_ACCEPT_ATTRIBUTE } from "@/lib/documents/convert/formats";

/**
 * Imports a file as a new document.
 *
 * The file input is hidden behind a button because the native control cannot be
 * styled to match, and it is reset after every attempt so choosing the same file
 * twice in a row still fires a change event.
 */
export function ImportDocumentButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function upload(file: File) {
    setImporting(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/documents/import", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as {
        id?: string;
        title?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.id) {
        // The server's message names the actual problem — wrong type, too large,
        // unreadable — so it is shown rather than a generic failure.
        toast.error(payload?.error ?? "That file could not be imported.");
        return;
      }

      toast.success(`Imported “${payload.title}”`);
      router.push(`/documents/${payload.id}`);
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={IMPORT_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={importing}
        onClick={() => input.current?.click()}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import
      </Button>
    </>
  );
}
