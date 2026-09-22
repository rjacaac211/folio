"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentContent } from "@/lib/documents/content";

export type SaveState =
  | { status: "idle"; savedAt: Date | null }
  | { status: "pending"; savedAt: Date | null }
  | { status: "saving"; savedAt: Date | null }
  | { status: "saved"; savedAt: Date }
  | { status: "error"; savedAt: Date | null; message: string }
  | { status: "conflict"; savedAt: Date | null };

const AUTOSAVE_DELAY_MS = 800;

/**
 * Debounced autosave with optimistic concurrency.
 *
 * Saves are serialised by a drain loop: while a request is in flight, further
 * edits collect in `pending` and are sent on the next pass, so the server never
 * receives two writes racing on the same version.
 *
 * A 409 means someone else saved first. The pending edit is dropped and the
 * caller surfaces a reload prompt — which is the entire reason the document
 * carries a version.
 */
export function useDocumentSave(documentId: string, initialVersion: number) {
  const [state, setState] = useState<SaveState>({ status: "idle", savedAt: null });

  const version = useRef(initialVersion);
  const pending = useRef<DocumentContent | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      while (pending.current) {
        const content = pending.current;
        pending.current = null;
        setState((previous) => ({ status: "saving", savedAt: previous.savedAt }));

        let response: Response;
        try {
          response = await fetch(`/api/documents/${documentId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content, version: version.current }),
          });
        } catch {
          // A network failure, not a rejection: the edit is still in the editor,
          // so nothing is lost by retrying.
          setState((previous) => ({
            status: "error",
            savedAt: previous.savedAt,
            message: "You appear to be offline. Changes are not saved.",
          }));
          return;
        }

        if (response.status === 409) {
          pending.current = null;
          setState((previous) => ({ status: "conflict", savedAt: previous.savedAt }));
          return;
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          setState((previous) => ({
            status: "error",
            savedAt: previous.savedAt,
            message: body?.error ?? "Could not save your changes.",
          }));
          return;
        }

        const saved = (await response.json()) as { version: number };
        version.current = saved.version;
        setState({ status: "saved", savedAt: new Date() });
      }
    } finally {
      inFlight.current = false;
    }
  }, [documentId]);

  const save = useCallback(
    (content: DocumentContent) => {
      pending.current = content;
      setState((previous) =>
        previous.status === "conflict"
          ? previous
          : { status: "pending", savedAt: previous.savedAt },
      );

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  // Don't let the debounce timer swallow the last edit when the tab goes away.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden" && pending.current) void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const hasUnsavedWork = state.status === "pending" || state.status === "saving";

  // Native guard against closing the tab mid-save.
  useEffect(() => {
    if (!hasUnsavedWork) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedWork]);

  return { state, save };
}
