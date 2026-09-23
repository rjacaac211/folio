# Architecture

What Folio is built from, what I prioritised, and what I deliberately left out.

---

## The one idea

**Every document read and write passes through a single authorization function.**

Everything else in the product inherits its correctness from that. Sharing, attachments and
export are not three access-control implementations — they are three callers of one.

The clearest evidence is what happens when access is revoked. One `DELETE` on a share row
closes the document, its attachments and its exports at the same moment, with no cleanup step,
because each of those paths calls `requireDocumentAccess` rather than repeating the check:

```
ava can read before revoke          200
mia revokes ava                     204
ava reads after revoke              404
ava writes after revoke             404
ava lists attachments after revoke  404
ava exports after revoke            404
```

That is the shape of the codebase in one result.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | Server components keep authorization on the server by default; one deployable unit |
| Editor | TipTap 3 (ProseMirror) | Headless, so the interface is ours; emits JSON rather than HTML |
| Database | Postgres via Prisma 7 | Relational data with real constraints; `jsonb` for document bodies |
| Hosting | Vercel + Neon Postgres + Vercel Blob | Free tier, no card, and migrations run on every deploy |
| Tests | Vitest | Fast, node-only — the risky logic here is plain functions |

---

## Data model

```
users        id, email (unique), name, avatarColor
documents    id, title, content (jsonb), version, ownerId, timestamps
shares       (documentId, userId) PK, role
attachments  id, documentId, filename, mimeType, size, pathname, uploadedById
```

Three decisions worth naming:

**`shares` has a composite primary key.** "One role per user per document" is a database
guarantee, not something application code has to remember. A duplicate share is impossible
rather than merely unlikely.

**`documents.content` is `jsonb`, not HTML.** TipTap's document JSON round-trips exactly.
Storing HTML would mean re-parsing on every load and losing the distinction between structure
the editor understands and markup it happens to render.

**`documents.version` is an integer bumped on every content write.** This is what makes
concurrent editing safe. See below.

---

## Concurrency: optimistic versioning

Two people can hold the same document open. Rather than let the second save overwrite the first,
the client sends the version it loaded and the update is made conditional on that version still
being current:

```sql
UPDATE documents
   SET content = ?, version = version + 1
 WHERE id = ? AND version = ?
```

Zero rows affected means someone else saved first, which becomes a `409`, a banner, and a frozen
editor rather than a silently lost paragraph.

**The check and the write are one statement.** Reading the version and then writing would leave
a race between the two — the exact bug this is meant to prevent.

Saves are also serialised client-side through a drain loop: edits made while a request is in
flight are held and sent on the next pass, so the server never receives two writes racing on the
same version from the same tab.

**This is not real-time collaboration.** It is the guarantee that you never silently lose work.
See "What I left out".

---

## Authorization

The permission model lives in `lib/authz/policy.ts` as **pure functions** — no database, no
request object. That is deliberate: it makes the entire matrix testable as a literal table.

|            | read | write | share | delete |
| ---------- | ---- | ----- | ----- | ------ |
| **Owner**  | ✅    | ✅     | ✅     | ✅      |
| **Editor** | ✅    | ✅     | ❌     | ❌      |
| **Viewer** | ✅    | ❌     | ❌     | ❌      |
| **None**   | ❌    | ❌     | ❌     | ❌      |

Two details that are easy to get wrong:

**Ownership is resolved before share rows.** Otherwise sharing a document with yourself as Viewer
would downgrade you on your own document.

**No access returns 404, not 403.** A 403 confirms the resource exists, which turns the API into
a way to discover valid document IDs. Someone who *can* read a document and attempts a write gets
an honest 403, because hiding it from them would only be confusing.

Authorization is enforced on the server for every request. Disabled buttons are a courtesy, not a
control — verified by calling the API directly as each role.

---

## Handling untrusted input

Imports and attachments are the only places a stranger's bytes enter the system, so both are
treated as hostile.

**Imported files are converted through the editor's own schema.** `.docx` and `.md` become HTML
first, then pass through TipTap's `generateJSON` with the same extension set the editor uses.
Anything the schema cannot represent — scripts, styles, iframes, unknown attributes — is dropped
by construction. The sanitiser is the schema, not a blocklist.

**Declared types are not trusted.** The extension selects a decoder and the bytes are then checked
against it: a `.docx` must actually begin with a zip header, and anything claiming to be text is
rejected if it contains NUL bytes. The browser's `accept` attribute is a convenience; the server
re-checks everything.

**Attachments use an allowlist**, so a new dangerous format does not become accepted by omission.
HTML and SVG are excluded deliberately — both can carry scripts, and serving them from our own
origin would let an attachment run code against the app.

**Filenames are sanitised before storage** — directory components, control characters, quotes and
backslashes removed — so a name cannot escape its directory or inject lines into a response header.

**Attachments are stored privately with no public URL.** This changed during the build: the
original plan used public blob URLs, and setting up storage made the flaw concrete — a public URL
outlives a revoked share. Downloads now go through a route that re-runs the document's access
check.

---

## What I prioritised, and why

**Authorization first, interface second.** The permission model was built and tested in the third
change, before any sharing UI existed. By the time the Share dialog was built, the feature that
looks like the hard part was mostly interface work — the rules were already proven.

**Depth over coverage.** The brief asked for a coherent slice rather than a broad one. Sharing,
access control and file handling got real attention; things like folders, search, trash and
document deletion from the UI got none.

**Verification over test count.** 156 tests pass, but the bugs that mattered most were not caught
by them — see `AI_WORKFLOW.md`. Every feature was also exercised against the running app, and the
deployment was verified end to end on production rather than assumed.

---

## What I left out, deliberately

**Real-time collaborative editing.** The most requested-sounding feature, and the most expensive.
It needs a persistent websocket server — a poor fit for serverless — plus a CRDT and an awareness
protocol. That is the entire timebox on its own. Optimistic versioning delivers the property that
actually matters to a user, which is never silently losing work, for a fraction of the cost.

**Comments and suggestion mode.** A second document-shaped data model with its own positioning
and lifecycle. Interesting, but it would have come out of sharing or file handling.

**Version history.** The `version` column counts saves; it does not retain snapshots. Storing
every revision is cheap, but the interface for browsing and restoring them is not.

**An AI feature in the product.** Considered and cut. The brief's optional list does not include
one, and it states plainly that it evaluates *practical* AI usage rather than volume — so adding
a rewrite button to look AI-native would have been exactly the wrong signal. The AI story is in
`AI_WORKFLOW.md`, where the brief asks for it.

**Rate limiting.** Size, type and per-document count limits are enforced, but there is no
per-user throttle on upload or import. The first thing I would add before real users.

**Real credentials.** Sessions and server-side authorization are real; the password step is not.
Reviewers can test the sharing model in two tabs in seconds, which was worth more here than
demonstrating a login form.

---

## Known tradeoffs

**Preview and production share one database.** Preview deployments therefore show real seeded
data, which makes them useful to review — but edits made on a preview URL appear in production.
A real deployment would use a database branch per preview.

**`pg` SSL deprecation.** Neon's connection string uses `sslmode=require`, which current `pg`
treats as `verify-full`. A future `pg` v9 will adopt libpq semantics, which are weaker. Nothing
breaks today; the fix is to pin `sslmode=verify-full` explicitly at upgrade time.

**Blob cleanup on failure.** An attachment's blob is deleted before its row. If the row delete
then failed, the file would show as broken; the reverse order would leave orphaned bytes. I chose
the visible failure over the invisible one, but neither is transactional.

---

## With another 2–4 hours

1. **Rate limiting** on the import and attachment routes — the clearest real gap.
2. **Version history** — the column already exists; storing snapshots and a restore action is
   mostly interface work.
3. **Real-time presence indicators** — showing *who else is here* without full CRDT editing, as a
   cheap step toward collaboration.
4. **An end-to-end browser test** of the share flow, to cover the wiring the unit tests cannot.
