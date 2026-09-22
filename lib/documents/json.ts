import type { Prisma } from "@/lib/generated/prisma/client";
import type { DocumentContent } from "./content";

/**
 * Hands a document body to Prisma's `Json` column type.
 *
 * Prisma's `InputJsonValue` requires an index signature, which `DocumentContent`
 * deliberately does not have — the domain type is a closed shape so that typos in
 * node fields are caught at compile time. Rather than loosen the domain type or
 * repeat a cast at every call site, the conversion is confined to this function.
 *
 * Reading back is the direction that actually matters for safety, and that path
 * goes through `isDocumentContent`, which validates rather than asserts.
 */
export function toJsonInput(content: DocumentContent): Prisma.InputJsonValue {
  return content as unknown as Prisma.InputJsonValue;
}
