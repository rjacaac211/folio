import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readSessionToken, SESSION_COOKIE } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
};

/**
 * Resolves the signed-in user, or null.
 *
 * The cookie only vouches for an id; the user is loaded fresh on every request
 * so a deleted or renamed account is reflected immediately rather than being
 * cached in a token until it expires.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const userId = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarColor: true },
  });
}

/** For pages that require a session. Redirects to the sign-in picker. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
