# Folio

A lightweight collaborative document editor — create, format, import, share.

## Stack

| Layer           | Choice                                          |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript    |
| Styling         | Tailwind CSS 4, shadcn/ui                        |
| Database        | Postgres (local via Docker Compose)              |
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
cp .env.example .env.local
```

The defaults match the bundled Docker Compose service, so no edits are needed for local
development.

### 3. Start Postgres

```bash
docker compose up -d
```

Postgres listens on **port 5433**, chosen so it never collides with a Postgres already running on
5432.

**No Docker?** Point `DATABASE_URL` at any Postgres instance instead — a free
[Neon](https://neon.tech) branch works — and skip this step.

### 4. Run the app

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

## Environment variables

| Variable                | Required | Purpose                                                       |
| ----------------------- | -------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | Postgres connection string                                     |
| `SESSION_SECRET`        | Yes      | Signs session cookies                                          |
| `BLOB_READ_WRITE_TOKEN` | No       | Blob storage token for attachments; empty disables uploads     |

## Project structure

```
app/          Next.js routes (App Router)
components/   React components; components/ui holds shadcn/ui primitives
lib/          Domain logic, utilities, and their colocated tests
```
