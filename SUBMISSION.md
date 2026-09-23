# Submission

**Folio** — a lightweight collaborative document editor.

| | |
| --- | --- |
| **Live app** | https://folio-omega-cyan.vercel.app |
| **Source** | https://github.com/rjacaac211/folio |
| **Walkthrough video** | see `VIDEO.txt` |

No credentials are needed. Sign-in is a picker of seeded demo accounts.

---

## Demo accounts

Pick any of these on the sign-in screen. To see sharing, open two browser profiles (or one normal
and one private window) and sign in as two different people.

| User | Email | Owns | Also has access to |
| --- | --- | --- | --- |
| **Ava Chen** | `ava@folio.dev` | Q3 Planning | Onboarding Research Notes *(viewer)* |
| **Ben Ortiz** | `ben@folio.dev` | Onboarding Research Notes | Q3 Planning *(editor)* |
| **Mia Park** | `mia@folio.dev` | Release Checklist | Q3 Planning *(viewer)* |

The seed covers all three access states — owned, shared as editor, shared as viewer — so every
permission branch is reachable without setting anything up.

---

## What's included

| File | Contents |
| --- | --- |
| `README.md` | Setup, run instructions, features, limits, demo accounts |
| `ARCHITECTURE.md` | Design decisions, what was prioritised, what was left out and why |
| `AI_WORKFLOW.md` | How AI was used, what was rejected, how correctness was verified |
| `SUBMISSION.md` | This file |
| `VIDEO.txt` | Walkthrough video link |
| `docs/screenshots/` | Seven screenshots of the live deployment |
| Source | Full application — see the 7 merged pull requests for the build history |

---

## What works end to end

- **Documents** — create, rename, edit, autosave, reopen. Formatting and structure survive a
  refresh.
- **Rich text** — bold, italic, underline, strikethrough, three heading levels, bulleted and
  numbered lists, quotes, undo/redo.
- **Concurrent editing** — a save from a stale version is rejected with `409` and a reload prompt
  rather than silently overwriting someone's work.
- **Import** — `.docx`, `.md`, `.txt` become new documents with formatting preserved. Type is
  checked against the file's bytes, not its name.
- **Export** — Markdown, plain text, and print-to-PDF.
- **Attachments** — upload, download, delete. Stored privately with no public URL; every download
  re-runs the document's access check.
- **Sharing** — grant by email as Viewer or Editor, change roles, revoke. Owned and shared
  documents are separated on the dashboard.
- **Access control** — enforced server-side on every request, verified by calling the API
  directly as each role.

## What is incomplete

Nothing that was started is half-finished. The following were **deliberately not built**, with
reasoning in `ARCHITECTURE.md`:

- **Real-time collaborative editing** — needs a persistent websocket server and a CRDT; that is
  the whole timebox. Optimistic versioning gives the property that matters (never silently losing
  work) for a fraction of the cost.
- **Comments / suggestion mode** — a second document-shaped data model.
- **Version history** — the version column counts saves but does not retain snapshots.
- **Rate limiting** — size, type and per-document count limits are enforced, but there is no
  per-user throttle.
- **Real credentials** — sessions and authorization are real; the password step is not, so
  reviewers can test sharing in two tabs.

## With another 2–4 hours

1. Rate limiting on the import and attachment routes — the clearest real gap.
2. Version history — the column exists; snapshots and a restore action are mostly interface work.
3. Real-time presence indicators, as a cheap step toward collaboration.
4. An end-to-end browser test of the share flow, covering wiring the unit tests cannot.

---

## Running it locally

Full instructions are in `README.md`. The short version:

```bash
pnpm install
cp .env.example .env
docker compose up -d          # Postgres on 5433
pnpm db:migrate && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

No Docker? Point `DATABASE_URL` at any Postgres instance instead.

Attachments need `BLOB_READ_WRITE_TOKEN`. Without it the rest of the app runs normally and the
upload control explains that storage is unconfigured — local setup is never blocked by it.

## Quality checks

```bash
pnpm test        # 156 tests
pnpm lint
pnpm typecheck
pnpm build
```
