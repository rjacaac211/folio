"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Level = 1 | 2 | 3;

const BLOCK_OPTIONS: Array<{ label: string; level: Level | null }> = [
  { label: "Normal text", level: null },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
];

function ToolbarButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          // The editor loses its selection if the button takes focus.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          className={cn(
            "hover:bg-accent focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
            active && "bg-accent text-accent-foreground",
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const currentLevel = ([1, 2, 3] as Level[]).find((level) =>
    editor.isActive("heading", { level }),
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton
        label="Undo"
        icon={<Undo2 className="size-4" />}
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        label="Redo"
        icon={<Redo2 className="size-4" />}
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />

      <Separator orientation="vertical" className="mx-1 !h-5" />

      <select
        aria-label="Text style"
        disabled={disabled}
        value={currentLevel ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          const chain = editor.chain().focus();
          if (value === "") chain.setParagraph().run();
          else chain.toggleHeading({ level: Number(value) as Level }).run();
        }}
        className="border-input bg-background focus-visible:ring-ring h-8 rounded border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
      >
        {BLOCK_OPTIONS.map((option) => (
          <option key={option.label} value={option.level ?? ""}>
            {option.label}
          </option>
        ))}
      </select>

      <Separator orientation="vertical" className="mx-1 !h-5" />

      <ToolbarButton
        label="Bold"
        icon={<Bold className="size-4" />}
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        icon={<Italic className="size-4" />}
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Underline"
        icon={<UnderlineIcon className="size-4" />}
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        label="Strikethrough"
        icon={<Strikethrough className="size-4" />}
        active={editor.isActive("strike")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />

      <Separator orientation="vertical" className="mx-1 !h-5" />

      <ToolbarButton
        label="Bulleted list"
        icon={<List className="size-4" />}
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Numbered list"
        icon={<ListOrdered className="size-4" />}
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        label="Quote"
        icon={<Quote className="size-4" />}
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
    </div>
  );
}
