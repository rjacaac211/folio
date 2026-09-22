"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

/**
 * Signs in as one of the seeded demo accounts.
 *
 * There is no password step: this product is a demo, and asking reviewers to
 * manage credentials would add friction without demonstrating anything. What it
 * does still do is verify the account exists and issue a signed cookie, so every
 * downstream authorization check is real rather than trusting a client-supplied
 * user id.
 */
export async function signIn(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string" || userId === "") {
    throw new Error("A user must be selected to sign in.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new Error("That account no longer exists. Re-run the seed and try again.");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);

  redirect("/documents");
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
