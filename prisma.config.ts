import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the CLI only — migrations and introspection.
    //
    // Migrations take advisory locks and run DDL, which a transaction-mode
    // connection pooler cannot support, so this prefers the direct endpoint.
    // The application itself connects through DATABASE_URL (see lib/db.ts),
    // which on a pooled host is the pooler.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
