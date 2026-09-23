import { del, get, put } from "@vercel/blob";

/**
 * Blob storage, wrapped so the rest of the app never touches the SDK directly.
 *
 * Attachments are stored with `access: "private"`, which means they have no
 * publicly reachable URL. Every read goes back through our own route, which runs
 * the same authorization check documents do. A public URL would outlive a
 * revoked share: anyone who had copied the link could keep opening the file after
 * losing access to the document it belongs to.
 */
export type StoredBlob = {
  pathname: string;
  size: number;
};

/**
 * Whether uploads are available.
 *
 * Local development without a token is a supported state: the rest of the app
 * works and the upload control explains why it is unavailable, rather than
 * failing at the moment someone tries to use it.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storeAttachment(
  documentId: string,
  filename: string,
  contentType: string,
  body: Buffer,
): Promise<StoredBlob> {
  // Keying by document makes the stored objects traceable back to their owner,
  // and `addRandomSuffix` keeps two uploads of the same filename apart.
  const result = await put(`documents/${documentId}/${filename}`, body, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });

  return { pathname: result.pathname, size: body.byteLength };
}

export async function readAttachment(pathname: string) {
  return get(pathname, { access: "private" });
}

export async function deleteAttachment(pathname: string): Promise<void> {
  await del(pathname);
}
