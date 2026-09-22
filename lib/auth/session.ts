import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "folio_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Session cookies are a signed user id, not encrypted state.
 *
 * The cookie carries `<userId>.<hmac>`. Anyone can read which user id it names —
 * that is not a secret — but without SESSION_SECRET they cannot forge one for a
 * different user. Keeping the payload this small means there is no session store
 * to expire, and nothing stale to invalidate: every request resolves the id
 * against the database, so a deleted user's cookie stops working immediately.
 */
function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Copy .env.example to .env and fill it in.");
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, secret: string = requireSecret()): string {
  return `${userId}.${sign(userId, secret)}`;
}

/**
 * Returns the user id a token vouches for, or null if the token is missing,
 * malformed, or not signed by this secret.
 */
export function readSessionToken(
  token: string | undefined | null,
  secret: string = requireSecret(),
): string | null {
  if (!token) return null;

  // The user id is a cuid and contains no dots, but splitting from the right
  // keeps this correct even if the id format changes later.
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const userId = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(userId, secret));

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  // The length of an HMAC digest is not secret, so this leaks nothing.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  return userId;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
