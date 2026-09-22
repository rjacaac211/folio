import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import type { DocumentContent } from "../lib/documents/content";
import { toJsonInput } from "../lib/documents/json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type Block = DocumentContent["content"];

/** Builds a document body already converted for Prisma's Json column. */
function doc(...blocks: NonNullable<Block>) {
  return toJsonInput({ type: "doc", content: blocks });
}

function heading(level: number, text: string) {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function bullets(...items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  };
}

function ordered(...items: string[]) {
  return {
    type: "orderedList",
    content: items.map((text) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  };
}

/** Demo accounts. Sign-in is a picker, so these need no passwords. */
const USERS = [
  { email: "ava@folio.dev", name: "Ava Chen", avatarColor: "violet" },
  { email: "ben@folio.dev", name: "Ben Ortiz", avatarColor: "emerald" },
  { email: "mia@folio.dev", name: "Mia Park", avatarColor: "amber" },
] as const;

async function main() {
  // Seeding is re-runnable: clearing documents cascades to shares and
  // attachments, so a second run does not accumulate duplicates.
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const [ava, ben, mia] = await Promise.all(
    USERS.map((user) => prisma.user.create({ data: user })),
  );

  await prisma.document.create({
    data: {
      title: "Q3 Planning",
      ownerId: ava.id,
      content: doc(
        heading(1, "Q3 Planning"),
        paragraph("Three bets this quarter, in priority order."),
        ordered(
          "Rewrite onboarding so the first document is created in under a minute.",
          "Ship the billing migration before the September renewal wave.",
          "Cut p95 editor load time to under 400ms.",
        ),
        heading(2, "Open questions"),
        bullets(
          "Do we need a migration path for legacy workspaces?",
          "Who owns the comms plan for the billing change?",
        ),
      ),
      // Ben helps write this one; Mia is only keeping an eye on it.
      shares: {
        create: [
          { userId: ben.id, role: "EDITOR" },
          { userId: mia.id, role: "VIEWER" },
        ],
      },
    },
  });

  await prisma.document.create({
    data: {
      title: "Onboarding Research Notes",
      ownerId: ben.id,
      content: doc(
        heading(1, "Onboarding Research Notes"),
        paragraph("Eight interviews with accounts that churned inside 30 days."),
        heading(2, "What we heard"),
        bullets(
          "The empty state gives no indication of what to do first.",
          "Sharing was discovered late, usually by accident.",
          "Nobody noticed that documents autosave.",
        ),
        paragraph("The through-line: people are unsure whether their work is safe."),
      ),
      // Shared back to Ava so the dashboard has something under "Shared with me".
      shares: { create: [{ userId: ava.id, role: "VIEWER" }] },
    },
  });

  await prisma.document.create({
    data: {
      title: "Release Checklist",
      ownerId: mia.id,
      content: doc(
        heading(1, "Release Checklist"),
        paragraph("Run through this before promoting a build to production."),
        ordered(
          "All migrations applied and reversible.",
          "Smoke test sign-in, document creation, and sharing.",
          "Confirm error reporting is receiving events.",
        ),
      ),
    },
  });

  const counts = {
    users: await prisma.user.count(),
    documents: await prisma.document.count(),
    shares: await prisma.share.count(),
  };
  console.log(
    `Seeded ${counts.users} users, ${counts.documents} documents, ${counts.shares} shares.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
