"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import type { ShareRole } from "@/lib/sharing/validate";

export type Person = { id: string; name: string; email: string; avatarColor: string };
export type Share = { role: ShareRole; user: Person };

export function ShareDialog({
  documentId,
  documentTitle,
  owner,
  initialShares,
  canManage,
}: {
  documentId: string;
  documentTitle: string;
  owner: Person;
  initialShares: Share[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const payload = (await response.json().catch(() => null)) as
        (Share & { error?: string }) | null;

      if (!response.ok || !payload?.user) {
        // The server names the actual problem — unknown address, already the
        // owner — which is more useful than a generic failure.
        toast.error(payload?.error ?? "Could not share this document.");
        return;
      }

      setShares((current) => [
        ...current.filter((share) => share.user.id !== payload.user.id),
        { role: payload.role, user: payload.user },
      ]);
      setEmail("");
      toast.success(`Shared with ${payload.user.name}`);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, nextRole: ShareRole) {
    setPendingUser(userId);
    try {
      const response = await fetch(`/api/documents/${documentId}/shares/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(payload?.error ?? "Could not change access.");
        return;
      }
      setShares((current) =>
        current.map((share) => (share.user.id === userId ? { ...share, role: nextRole } : share)),
      );
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPendingUser(null);
    }
  }

  async function revoke(person: Person) {
    setPendingUser(person.id);
    try {
      const response = await fetch(`/api/documents/${documentId}/shares/${person.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(payload?.error ?? "Could not remove access.");
        return;
      }
      setShares((current) => current.filter((share) => share.user.id !== person.id));
      toast.success(`Removed ${person.name}`);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPendingUser(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-print-hidden>
          <Share2 className="size-4" />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Share “{documentTitle}”</DialogTitle>
          <DialogDescription>
            {canManage
              ? "People you add can open this document straight away."
              : "Only the owner can change who has access."}
          </DialogDescription>
        </DialogHeader>

        {canManage ? (
          <form onSubmit={grant} className="flex items-center gap-2">
            <Input
              type="email"
              required
              placeholder="name@folio.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
              className="flex-1"
            />
            <Select value={role} onValueChange={(value) => setRole(value as ShareRole)}>
              <SelectTrigger className="w-28" aria-label="Access level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={busy || email.trim() === ""}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Share"}
            </Button>
          </form>
        ) : null}

        <div>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            People with access
          </h3>

          <ul className="space-y-1">
            <li className="flex items-center gap-3 rounded-md px-1 py-1.5">
              <UserAvatar user={owner} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{owner.name}</p>
                <p className="text-muted-foreground truncate text-xs">{owner.email}</p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">Owner</span>
            </li>

            {shares.map((share) => (
              <li key={share.user.id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
                <UserAvatar user={share.user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{share.user.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{share.user.email}</p>
                </div>

                {canManage ? (
                  <>
                    <Select
                      value={share.role}
                      disabled={pendingUser === share.user.id}
                      onValueChange={(value) => void changeRole(share.user.id, value as ShareRole)}
                    >
                      <SelectTrigger
                        className="h-8 w-24 shrink-0"
                        aria-label={`Access level for ${share.user.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => void revoke(share.user)}
                      disabled={pendingUser === share.user.id}
                      aria-label={`Remove ${share.user.name}`}
                      className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 disabled:opacity-50"
                    >
                      {pendingUser === share.user.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {share.role === "EDITOR" ? "Editor" : "Viewer"}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {shares.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              This document has not been shared with anyone yet.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
