import { NextResponse } from "next/server";
import { AccessDeniedError } from "@/lib/authz";

export function errorResponse(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * Turns a thrown error into a response.
 *
 * AccessDeniedError already carries the status the policy decided on, so it is
 * passed through verbatim. Anything else is a bug: it is logged server-side and
 * reported as a generic 500, so internal details never reach the client.
 */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AccessDeniedError) {
    return errorResponse(error.status, error.message);
  }
  console.error("Unhandled route error:", error);
  return errorResponse(500, "Something went wrong.");
}
