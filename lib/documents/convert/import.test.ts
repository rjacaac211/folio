import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { documentToPlainText } from "../content";
import { importFile, MAX_IMPORT_BYTES } from "./index";

const bytes = (text: string) => new TextEncoder().encode(text);
const fixture = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name)));

describe("importFile", () => {
  it("imports a .docx, keeping headings and inline formatting", async () => {
    const result = await importFile("Quarterly Report.docx", fixture("quarterly-report.docx"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.title).toBe("Quarterly Report");

    const types = result.content.content?.map((node) => node.type);
    expect(types).toEqual(["heading", "paragraph", "heading", "paragraph"]);
    expect(result.content.content?.[0]?.attrs?.level).toBe(1);
    expect(result.content.content?.[2]?.attrs?.level).toBe(2);

    const marks = result.content.content?.[1]?.content?.flatMap((node) =>
      (node.marks ?? []).map((mark) => mark.type),
    );
    expect(marks).toEqual(["bold", "italic"]);

    expect(documentToPlainText(result.content)).toContain("eighteen percent");
  });

  it("imports markdown as structure, not as literal text", async () => {
    const result = await importFile("notes.md", bytes("# Heading\n\n- a\n- b\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("notes");
    expect(result.content.content?.map((node) => node.type)).toEqual(["heading", "bulletList"]);
  });

  it("imports plain text as paragraphs", async () => {
    const result = await importFile("notes.txt", bytes("First line\n\nSecond line\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.content?.map((node) => node.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("does not treat markdown syntax in a .txt file as formatting", async () => {
    const result = await importFile("notes.txt", bytes("# Not a heading"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content.content?.[0]?.type).toBe("paragraph");
    expect(documentToPlainText(result.content)).toBe("# Not a heading");
  });

  it("strips a directory prefix from the title", async () => {
    const result = await importFile(String.raw`C:\Users\rj\Documents\report.md`, bytes("hello"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("report");
  });

  it("rejects an unsupported extension", async () => {
    const result = await importFile("payload.exe", bytes("MZ"));
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("rejects a file larger than the limit", async () => {
    const tooBig = new Uint8Array(MAX_IMPORT_BYTES + 1).fill(65);
    const result = await importFile("big.txt", tooBig);
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects an empty file", async () => {
    const result = await importFile("empty.txt", new Uint8Array(0));
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects a binary file renamed to .md", async () => {
    // The extension says markdown; the bytes say otherwise. Trusting the name
    // would store binary junk as a document.
    const disguised = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a, 0x0a, 0x00]);
    const result = await importFile("innocent.md", disguised);
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("rejects a non-zip file renamed to .docx", async () => {
    const result = await importFile("fake.docx", bytes("this is not a zip archive"));
    expect(result).toMatchObject({ ok: false, status: 415 });
  });

  it("reports a corrupt .docx rather than throwing", async () => {
    // Starts with the zip signature but is not a readable archive.
    const corrupt = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03]);
    const result = await importFile("corrupt.docx", corrupt);
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("accepts the alternate markdown extension", async () => {
    const result = await importFile("readme.markdown", bytes("# Yes"));
    expect(result.ok).toBe(true);
  });

  it("matches the extension case-insensitively", async () => {
    const result = await importFile("NOTES.MD", bytes("# Yes"));
    expect(result.ok).toBe(true);
  });
});
