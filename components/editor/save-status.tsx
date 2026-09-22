"use client";

import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";
import type { SaveState } from "./use-document-save";

export function SaveStatus({ state, readOnly }: { state: SaveState; readOnly: boolean }) {
  if (readOnly) {
    return <span className="text-muted-foreground text-xs">View only</span>;
  }

  switch (state.status) {
    case "saving":
    case "pending":
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </span>
      );
    case "saved":
      return (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Check className="size-3" />
          Saved
        </span>
      );
    case "conflict":
      return (
        <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle className="size-3" />
          Out of date
        </span>
      );
    case "error":
      return (
        <span className="text-destructive flex items-center gap-1.5 text-xs">
          <CloudOff className="size-3" />
          Not saved
        </span>
      );
    default:
      return <span className="text-muted-foreground text-xs">All changes saved</span>;
  }
}
