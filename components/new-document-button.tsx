"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function NewDocumentButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    try {
      const response = await fetch("/api/documents", { method: "POST" });
      if (!response.ok) throw new Error("Request failed");
      const { id } = (await response.json()) as { id: string };
      router.push(`/documents/${id}`);
    } catch {
      toast.error("Could not create a document. Please try again.");
      setCreating(false);
    }
  }

  return (
    <Button onClick={() => void create()} disabled={creating} size="sm">
      {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      New document
    </Button>
  );
}
