import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { AccessDeniedError, can, requireDocumentAccess } from "@/lib/authz";
import { createEmptyDocument, isDocumentContent } from "@/lib/documents/content";
import { DocumentEditor } from "@/components/editor/document-editor";
import { isStorageConfigured } from "@/lib/attachments/storage";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  let access;
  try {
    access = await requireDocumentAccess(id, user.id, "read");
  } catch (error) {
    // A document that does not exist and one this user may not see are
    // indistinguishable here, which is the intent.
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }

  const { document, role } = access;

  const attachments = await prisma.attachment.findMany({
    where: { documentId: document.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return (
    <DocumentEditor
      document={{
        id: document.id,
        title: document.title,
        // Stored content is validated rather than asserted, so a malformed row
        // opens as an empty document instead of crashing the editor.
        content: isDocumentContent(document.content) ? document.content : createEmptyDocument(),
        version: document.version,
      }}
      role={role}
      canEdit={can(role, "write")}
      attachments={attachments.map((attachment) => ({
        ...attachment,
        createdAt: attachment.createdAt.toISOString(),
      }))}
      storageEnabled={isStorageConfigured()}
    />
  );
}
