"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { DocumentContent } from "@/lib/documents/content";
import { documentToPlainText } from "@/lib/documents/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { editorExtensions } from "./extensions";
import { MenuBar, type ViewOptions } from "./menu-bar";
import { SaveStatus } from "./save-status";
import { Toolbar } from "./toolbar";
import { useDocumentSave } from "./use-document-save";

const ROLE_LABEL = { OWNER: "Owner", EDITOR: "Editor", VIEWER: "Viewer" } as const;

export type EditorDocument = {
  id: string;
  title: string;
  content: DocumentContent;
  version: number;
};

export function DocumentEditor({
  document: initial,
  role,
  canEdit,
}: {
  document: EditorDocument;
  role: keyof typeof ROLE_LABEL;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [view, setView] = useState<ViewOptions>({ fullWidth: false, showWordCount: false });
  const { state, save } = useDocumentSave(initial.id, initial.version);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initial.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[60vh]",
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor: instance }) => {
      save(instance.getJSON() as DocumentContent);
    },
  });

  // A conflict means further edits cannot be saved, so stop accepting them
  // rather than letting someone keep typing into a document that will not save.
  //
  // `setEditable` emits an update event by default, which would be read as a
  // document change and trigger a save — which changes the save state, which
  // re-runs this effect. That is an infinite autosave loop, so updates are
  // suppressed and the call is skipped when the value has not actually changed.
  const editable = canEdit && state.status !== "conflict";
  useEffect(() => {
    if (!editor || editor.isEditable === editable) return;
    editor.setEditable(editable, false);
  }, [editor, editable]);

  const renameDocument = useCallback(async () => {
    const next = window.prompt("Rename document", title);
    if (next === null) return;

    const previous = title;
    setTitle(next.trim() || "Untitled document");
    try {
      const response = await fetch(`/api/documents/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!response.ok) throw new Error("Request failed");
      const saved = (await response.json()) as { title: string };
      setTitle(saved.title);
      router.refresh();
    } catch {
      setTitle(previous);
      toast.error("Could not rename this document.");
    }
  }, [initial.id, router, title]);

  if (!editor) return null;

  const words = view.showWordCount
    ? documentToPlainText(editor.getJSON() as DocumentContent)
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background sticky top-14 z-20 border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/documents"
              aria-label="All documents"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={canEdit ? () => void renameDocument() : undefined}
                  disabled={!canEdit}
                  className={cn(
                    "truncate rounded px-1 text-sm font-medium",
                    canEdit && "hover:bg-accent cursor-text",
                  )}
                  title={canEdit ? "Rename" : undefined}
                >
                  {title}
                </button>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {ROLE_LABEL[role]}
                </Badge>
                <SaveStatus state={state} readOnly={!canEdit} />
              </div>

              <MenuBar
                editor={editor}
                canEdit={canEdit}
                onRename={() => void renameDocument()}
                view={view}
                onViewChange={setView}
              />
            </div>
          </div>

          <div className="mt-1">
            <Toolbar editor={editor} disabled={!canEdit || state.status === "conflict"} />
          </div>
        </div>
      </div>

      {state.status === "conflict" ? (
        <div className="border-b border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 text-sm">
            <RefreshCw className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <p className="flex-1 text-amber-900 dark:text-amber-200">
              Someone else saved this document while you were editing. Reload to get their changes —
              your unsaved edits here will be lost.
            </p>
            <Button size="sm" variant="outline" onClick={() => router.refresh()}>
              Reload
            </Button>
          </div>
        </div>
      ) : null}

      <div className="bg-muted/40 flex-1 px-4 py-8">
        <div
          className={cn(
            "bg-card mx-auto rounded-lg border p-10 shadow-sm md:p-16",
            view.fullWidth ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          <EditorContent editor={editor} className="folio-prose" />
        </div>

        {view.showWordCount ? (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            {words} {words === 1 ? "word" : "words"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
