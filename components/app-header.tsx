import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/session";
import type { CurrentUser } from "@/lib/auth/current-user";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/documents" className="font-heading text-lg font-semibold tracking-tight">
          Folio
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
            <UserAvatar user={user} />
            <span className="sr-only">Account menu for {user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground block text-xs">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
