export const SHARE_ROLES = ["VIEWER", "EDITOR"] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

/**
 * Deliberately permissive.
 *
 * Address validity is decided by whether an account exists, not by a regular
 * expression — real addresses routinely fail strict patterns, and a wrong guess
 * here rejects a legitimate user with a confusing message. This only catches
 * input that could not be an address at all.
 */
const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Addresses are compared case-insensitively, so they are stored and looked up lowercased. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return PLAUSIBLE_EMAIL.test(email) && email.length <= 254;
}

export function isShareRole(value: unknown): value is ShareRole {
  return typeof value === "string" && SHARE_ROLES.includes(value as ShareRole);
}

export type ShareRequestProblem = { status: 400 | 404 | 409; error: string };

/**
 * Checks a share request that does not need the database.
 *
 * Kept separate from the route so the rules are readable and testable on their
 * own; whether the account exists is the route's job.
 */
export function checkShareRequest(
  email: unknown,
  role: unknown,
): { ok: true; email: string; role: ShareRole } | ({ ok: false } & ShareRequestProblem) {
  if (typeof email !== "string" || email.trim() === "") {
    return { ok: false, status: 400, error: "Enter an email address to share with." };
  }

  const normalized = normalizeEmail(email);
  if (!isPlausibleEmail(normalized)) {
    return { ok: false, status: 400, error: "That does not look like an email address." };
  }

  if (!isShareRole(role)) {
    return { ok: false, status: 400, error: "Choose either Viewer or Editor." };
  }

  return { ok: true, email: normalized, role };
}
