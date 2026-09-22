import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { UserAvatar } from "@/components/user-avatar";

export const metadata = { title: "Sign in — Folio" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/documents");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, avatarColor: true },
  });

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Folio</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            A lightweight collaborative document editor.
          </p>
        </div>

        <div className="bg-card rounded-xl border p-2 shadow-sm">
          <p className="text-muted-foreground px-3 pt-2 pb-3 text-xs font-medium tracking-wide uppercase">
            Continue as
          </p>

          {users.length === 0 ? (
            <p className="text-muted-foreground px-3 pb-3 text-sm">
              No accounts found. Run <code className="font-mono">pnpm db:seed</code> to create the
              demo users.
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((user) => (
                <li key={user.id}>
                  <form action={signIn}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button
                      type="submit"
                      className="hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <UserAvatar user={user} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{user.name}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {user.email}
                        </span>
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Demo mode — no passwords. Sign in as different people to try sharing.
        </p>
      </div>
    </main>
  );
}
