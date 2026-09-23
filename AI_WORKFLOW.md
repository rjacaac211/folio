# AI workflow

How AI was actually used to build Folio, what it got wrong, and how I verified the result.

---

## Tools

**Claude Code (Opus 5)** — the only AI tool used, across planning, implementation, test
generation, debugging and documentation.

I want to be straightforward about the extent: **Claude Code wrote most of the implementation,
under my direction.** Every architectural decision, every scope cut and every piece of
verification below was mine, and several of the model's suggestions were rejected outright. But
the typing was not the work, and it would be dishonest to imply otherwise.

---

## Where AI materially sped things up

**Scaffolding and boilerplate.** Project setup, Prisma schema, route handler skeletons, shadcn
wiring. Perhaps two hours of work compressed into twenty minutes, with no judgment required.

**The `.docx` conversion path.** Mapping Word's semantic styles onto the editor's schema is
exactly the kind of task where knowing the right library — mammoth, then TipTap's `generateJSON`
— matters more than writing the code. AI got me to a working pipeline quickly, and the insight
that the editor's own schema could serve as the sanitiser came out of that conversation.

**Test generation.** The permission matrix, the filename-sanitisation cases, the import
accept/reject table. Enumerating cases is tedious and AI is good at it. I still had to decide
*what* was worth testing — the matrix is thorough because I treated authorization as the
highest-risk logic, not because a model suggested it.

**Documentation.** Including this file. Drafted by AI from a decisions log kept during the
build, then edited for accuracy.

---

## What I changed or rejected

**Public blob URLs for attachments.** The plan I started from stored attachments publicly and
saved the URL on the row. Setting up the storage made the flaw concrete: **a public URL outlives
a revoked share.** Anyone who had copied a link would keep the file after losing access to the
document. Changed to private storage served through an authorized route. This is the single
most important correction in the project, and it came from thinking about the product, not from
a failing test.

**Four unused testing dependencies.** The scaffold installed jsdom, two Testing Library packages
and a Vite React plugin before a single component test existed. Removed all four — the risky
logic here is plain functions, so the test environment is `node`.

**`shadcn` as a runtime dependency.** The CLI added itself to `dependencies`. It is a build tool
and does not belong in a production bundle.

**A Prisma release candidate.** `pnpm add prisma` installed **8.0.0-rc.15**, because the `latest`
dist-tag was pointing at a pre-release. The install succeeded and nothing failed — I only caught
it by running `prisma --version` and reading the output. Pinned both packages to 7.10.0.

**A lint error, restructured rather than silenced.** React Compiler refused to memoize the
autosave function because it called itself recursively. The cheap fix is a disable comment;
instead I rewrote it as a drain loop, which removed the recursion and is clearer.

**My own wrong test expectations, twice.** I guessed at the output of a truncation helper rather
than computing it. Both times I ran the function and used the real values. Editing an assertion
until it goes green defeats the purpose of writing it.

---

## How I verified correctness

The honest headline: **the automated gates proved the code was consistent, not that it worked.**

156 tests, ESLint, `tsc --noEmit` and a production build were green while the application had
three real defects:

**1. An infinite autosave loop.** TipTap's `setEditable` emits an update event by default. That
read as a document change → triggered a save → changed the save state → re-ran the effect →
called `setEditable` again. On an idle page with nobody typing:

```
41 PUT requests        document version 1 → 42
```

Found by reading the dev server log, not by any test. After the fix: **0 saves at rest**, and
exactly **2 saves for 16 keystrokes**.

**2. A missing React provider.** The toolbar crashed on first render because `TooltipProvider`
was never added to the root layout — which the component library had warned about when the
tooltip was installed, and I had missed.

**3. A font that silently fell back to serif.** The layout defined `--font-geist-sans` while the
theme read `--font-sans`. The entire application rendered in Times while every check passed.
Caught only by taking a screenshot.

None of these are exotic. All three are the kind of defect that ships when "the tests pass" is
treated as "it works".

### What I did instead

**Exercised every feature against the running app**, not just the unit tests. Authorization was
verified by calling the API directly as each role, because a disabled button is not access
control:

```
mia (VIEWER)  PUT 403   PATCH 403   DELETE 403
ben (EDITOR)  PUT 200   PATCH 200   DELETE 403
```

**Verified the deployment end to end on production.** The decisive check: Ben opens a document
and Mia gets 404 on the same URL, on the live site, against the real database.

**Verified the attachment round-trip byte-for-byte** — 1083 bytes uploaded, 1083 bytes returned,
zip signature intact — plus the unauthenticated case, a cross-document scoping check, and delete.

**Checked appearance by looking at it.** Screenshots at each stage, and the print stylesheet
verified by rendering under print media. No automated check covers whether something looks right.

**Stated verification boundaries rather than implying coverage.** When attachments were built, I
could not test the storage round-trip before merging — the token is marked sensitive and the
preview deployment sits behind SSO. I said so explicitly in the pull request instead of letting
"133 tests pass" carry more weight than it deserved, then verified on production immediately
afterwards.

---

## A tooling failure worth reporting

Writing files through shell heredocs silently collapsed backslashes in regular expressions and
string literals. It happened three times. Once it produced a real bug that would have shipped:

```js
filename.split(/[/\\]/)   // intended — handles Windows paths
filename.split(/[/\]/)    // what was written — forward slash only
```

A file uploaded from Windows as `C:\docs\report.docx` would have been titled `C:\docs\report`.

**A test caught it within a minute**, because the case is easy to get wrong and therefore worth
asserting. After the third occurrence I stopped re-fixing it and removed the failure mode instead:
the path-splitting logic now lives in one shared helper, and files containing regex escapes are
written with a tool that does not pass through a shell.

This is the clearest thing I can say about working with AI tooling: the tools have failure modes
of their own, and tests are what make those failures survivable rather than silent.

---

## What I would tell another engineer

1. **Decide the architecture yourself.** The single authorization gate is why sharing was
   straightforward and why revocation needed no cleanup. No model volunteered that shape.
2. **Read the output, do not just run it.** The release candidate, the unused dependencies and
   the misplaced CLI dependency all passed every check.
3. **Watch the system, not only the suite.** The most serious bug in this project was visible in
   a log file and invisible to 156 tests.
4. **Say what you did not verify.** A stated gap is engineering; an implied one is a liability.
