import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { importFile, MAX_IMPORT_BYTES } from "@/lib/documents/convert";
import { toJsonInput } from "@/lib/documents/json";
import { errorResponse, handleRouteError } from "@/lib/http";

/**
 * Turns an uploaded file into a new document owned by the signed-in user.
 *
 * Conversion happens on the server, so the size and type rules cannot be skipped
 * by calling the endpoint directly — the browser's `accept` attribute is a
 * convenience, not a control.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to import a document.");

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      return errorResponse(400, "Attach a file to import.");
    }

    // Checked before reading the body into memory, so an oversized upload is
    // rejected rather than buffered.
    if (file.size > MAX_IMPORT_BYTES) {
      const limit = Math.round(MAX_IMPORT_BYTES / (1024 * 1024));
      return errorResponse(413, `Files must be ${limit} MB or smaller.`);
    }

    const result = await importFile(file.name, new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) {
      return errorResponse(result.status, result.error);
    }

    const document = await prisma.document.create({
      data: {
        title: result.title,
        content: toJsonInput(result.content),
        ownerId: user.id,
      },
      select: { id: true, title: true },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
