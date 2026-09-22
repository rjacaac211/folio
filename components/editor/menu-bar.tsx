"use client";

import type { Editor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";

export type ViewOptions = {
  fullWidth: boolean;
  showWordCount: boolean;
};

/**
 * A Google-Docs-style menu row, deliberately limited to four menus.
 *
 * Every item here does something. Rather than reproduce the full Docs menu set
 * with most entries greyed out, the menus only contain commands the editor
 * actually implements — a shorter menu is more honest than a disabled one.
 */
export function MenuBar({
  editor,
  canEdit,
  onRename,
  view,
  onViewChange,
}: {
  editor: Editor;
  canEdit: boolean;
  onRename: () => void;
  view: ViewOptions;
  onViewChange: (next: ViewOptions) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createDocument() {
    setCreating(true);
    try {
      const response = await fetch("/api/documents", { method: "POST" });
      if (!response.ok) throw new Error("Request failed");
      const { id } = (await response.json()) as { id: string };
      router.push(`/documents/${id}`);
    } catch {
      toast.error("Could not create a document. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const run = (fn: (chain: ReturnType<Editor["chain"]>) => void) => () => {
    const chain = editor.chain().focus();
    fn(chain);
  };

  return (
    <Menubar className="h-8 border-none bg-transparent p-0 shadow-none">
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-normal">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={() => void createDocument()} disabled={creating}>
            New document
          </MenubarItem>
          <MenubarItem onSelect={onRename} disabled={!canEdit}>
            Rename…
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={() => router.push("/documents")}>
            Back to all documents
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-normal">Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem
            onSelect={run((chain) => chain.undo().run())}
            disabled={!canEdit || !editor.can().undo()}
          >
            Undo <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            onSelect={run((chain) => chain.redo().run())}
            disabled={!canEdit || !editor.can().redo()}
          >
            Redo <MenubarShortcut>Ctrl+Y</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={run((chain) => chain.selectAll().run())}>
            Select all <MenubarShortcut>Ctrl+A</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-normal">Format</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={run((c) => c.toggleBold().run())} disabled={!canEdit}>
            Bold <MenubarShortcut>Ctrl+B</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={run((c) => c.toggleItalic().run())} disabled={!canEdit}>
            Italic <MenubarShortcut>Ctrl+I</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={run((c) => c.toggleUnderline().run())} disabled={!canEdit}>
            Underline <MenubarShortcut>Ctrl+U</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={run((c) => c.toggleStrike().run())} disabled={!canEdit}>
            Strikethrough
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={run((c) => c.setParagraph().run())} disabled={!canEdit}>
            Normal text
          </MenubarItem>
          {([1, 2, 3] as const).map((level) => (
            <MenubarItem
              key={level}
              onSelect={run((c) => c.toggleHeading({ level }).run())}
              disabled={!canEdit}
            >
              Heading {level}
            </MenubarItem>
          ))}
          <MenubarSeparator />
          <MenubarItem onSelect={run((c) => c.toggleBulletList().run())} disabled={!canEdit}>
            Bulleted list
          </MenubarItem>
          <MenubarItem onSelect={run((c) => c.toggleOrderedList().run())} disabled={!canEdit}>
            Numbered list
          </MenubarItem>
          <MenubarItem onSelect={run((c) => c.toggleBlockquote().run())} disabled={!canEdit}>
            Quote
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem
            onSelect={run((c) => c.unsetAllMarks().clearNodes().run())}
            disabled={!canEdit}
          >
            Clear formatting
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-normal">View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem
            checked={view.fullWidth}
            onCheckedChange={(checked) => onViewChange({ ...view, fullWidth: checked })}
          >
            Full width
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={view.showWordCount}
            onCheckedChange={(checked) => onViewChange({ ...view, showWordCount: checked })}
          >
            Word count
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
