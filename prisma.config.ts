import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Migrations take advisory locks and run DDL, neither of which a transaction-mode
 * connection pooler supports, so the CLI must use a direct connection. The
 * application itself goes through DATABASE_URL (see lib/db.ts), which on a pooled
 * host is the pooler.
 *
 * Managed Postgres providers each name their direct endpoint differently, so this
 * checks the common names rather than requiring the connection string to be
 * copied into a variable of our own. Falls back to DATABASE_URL for local
 * development, where there is no pooler and both are the same server.
 */
const directUrl =
  process.env["DIRECT_URL"] ??
  process.env["DATABASE_URL_UNPOOLED"] ??
  process.env["POSTGRES_URL_NON_POOLING"] ??
  process.env["DATABASE_POSTGRES_URL_NON_POOLING"] ??
  process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
