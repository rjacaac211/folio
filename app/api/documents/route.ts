import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { createEmptyDocument } from "@/lib/documents/content";
import { toJsonInput } from "@/lib/documents/json";
import { UNTITLED_TITLE } from "@/lib/documents/title";
import { errorResponse, handleRouteError } from "@/lib/http";

/** Creates an empty document owned by the signed-in user. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse(401, "Sign in to create a document.");

    const document = await prisma.document.create({
      data: {
        title: UNTITLED_TITLE,
        content: toJsonInput(createEmptyDocument()),
        ownerId: user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
