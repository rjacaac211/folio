# Folio

A lightweight collaborative document editor — create, format, import, share.

## Stack

| Layer           | Choice                                          |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript    |
| Styling         | Tailwind CSS 4, shadcn/ui                        |
| Database        | Postgres + Prisma (local via Docker Compose)     |
| Tests           | Vitest                                           |
| Package manager | pnpm                                             |

## Getting started

### Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer (`corepack enable pnpm`)
- Docker — optional, used to run Postgres locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults match the bundled Docker Compose service, so no edits are needed for local
development. A single `.env` is used because both Next.js and the Prisma CLI read it.

### 3. Start Postgres

```bash
docker compose up -d
```

Postgres listens on **port 5433**, chosen so it never collides with a Postgres already running on
5432.

**No Docker?** Point `DATABASE_URL` at any Postgres instance instead — a free
[Neon](https://neon.tech) branch works — and skip this step.

### 4. Create the schema and seed demo data

```bash
pnpm db:migrate
pnpm db:seed
```

Seeding is re-runnable: it clears documents and users first, so running it twice does not
produce duplicates.

### 5. Run the app

```bash
pnpm dev
```

The app is served at <http://localhost:3000>.

## Scripts

| Command           | What it does                     |
| ----------------- | -------------------------------- |
| `pnpm dev`        | Start the development server     |
| `pnpm build`      | Production build                 |
| `pnpm start`      | Serve the production build       |
| `pnpm test`       | Run the test suite once          |
| `pnpm test:watch` | Run tests in watch mode          |
| `pnpm lint`       | ESLint                           |
| `pnpm typecheck`  | TypeScript, no emit              |
| `pnpm format`     | Format source files with Prettier |
| `pnpm db:migrate` | Create and apply a migration     |
| `pnpm db:deploy`  | Apply migrations (production)    |
| `pnpm db:seed`    | Load demo users and documents    |
| `pnpm db:studio`  | Browse the database in Prisma Studio |
| `pnpm db:reset`   | Drop, re-migrate and re-seed     |

## Environment variables

| Variable                | Required | Purpose                                                       |
| ----------------------- | -------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | Postgres connection string                                     |
| `DIRECT_URL`            | Yes      | Unpooled connection, used by migrations only                   |
| `SESSION_SECRET`        | Yes      | Signs session cookies                                          |
| `BLOB_READ_WRITE_TOKEN` | No       | Blob storage token for attachments; empty disables uploads     |

## Project structure

```
app/          Next.js routes (App Router)
components/   React components; components/ui holds shadcn/ui primitives
lib/          Domain logic, utilities, and their colocated tests
prisma/       Schema, migrations, and the demo-data seed
```

## Demo accounts

Seeded by `pnpm db:seed`. Sign-in is a picker, so no passwords are needed.

| User      | Email           | Owns                      | Also has access to                   |
| --------- | --------------- | ------------------------- | ------------------------------------ |
| Ava Chen  | `ava@folio.dev` | Q3 Planning               | Onboarding Research Notes (viewer)   |
| Ben Ortiz | `ben@folio.dev` | Onboarding Research Notes | Q3 Planning (editor)                 |
| Mia Park  | `mia@folio.dev` | Release Checklist         | Q3 Planning (viewer)                 |

The seed deliberately covers all three states — owned, shared as editor, shared as viewer — so
the access rules are visible without setting anything up by hand.
