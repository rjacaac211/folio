import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Every page in this group requires a session; unauthenticated visitors are
  // redirected to the picker before any page code runs.
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader user={user} />
      {children}
    </div>
  );
}
