import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarUser = {
  name: string;
  avatarColor: string;
};

/**
 * Seeded users store a colour name rather than an image URL, so avatars stay
 * recognisable without any file storage. Classes are listed in full because
 * Tailwind scans source text and cannot resolve interpolated class names.
 */
const COLOR_CLASSES: Record<string, string> = {
  violet: "bg-violet-500 text-white",
  emerald: "bg-emerald-500 text-white",
  amber: "bg-amber-500 text-white",
  sky: "bg-sky-500 text-white",
  rose: "bg-rose-500 text-white",
};

const FALLBACK_COLOR = "bg-neutral-500 text-white";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function UserAvatar({ user, className }: { user: AvatarUser; className?: string }) {
  return (
    <Avatar className={cn("size-8 shrink-0", className)}>
      <AvatarFallback
        className={cn("text-xs font-medium", COLOR_CLASSES[user.avatarColor] ?? FALLBACK_COLOR)}
      >
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
