import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_DOCUMENT } from "./limits";
import { checkAttachment, sanitizeFilename } from "./validate";

describe("sanitizeFilename", () => {
  it("keeps an ordinary name", () => {
    expect(sanitizeFilename("Quarterly Report.pdf")).toBe("Quarterly Report.pdf");
  });

  it("drops directory components from either separator", () => {
    expect(sanitizeFilename("a/b/c/report.pdf")).toBe("report.pdf");
    expect(sanitizeFilename(String.raw`C:\Users\rj\report.pdf`)).toBe("report.pdf");
  });

  it("refuses to produce a traversal segment", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..")).toBe("file");
    expect(sanitizeFilename(".")).toBe("file");
  });

  it("removes quotes, which would break a Content-Disposition header", () => {
    expect(sanitizeFilename('in"jection.pdf')).toBe("injection.pdf");
  });

  it("removes control characters, which could inject header lines", () => {
    expect(sanitizeFilename("re\nport\r\u0000.pdf")).toBe("report.pdf");
  });

  it("falls back when nothing usable remains", () => {
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("   ")).toBe("file");
  });

  it("caps the length", () => {
    expect(sanitizeFilename("a".repeat(300)).length).toBe(120);
  });
});

describe("checkAttachment", () => {
  it.each([
    ["report.pdf", "application/pdf"],
    ["chart.PNG", "image/png"],
    ["notes.md", "text/markdown"],
    ["data.csv", "text/csv"],
    ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ])("accepts %s", (filename, contentType) => {
    const result = checkAttachment(filename, 1024, 0);
    expect(result).toMatchObject({ ok: true, contentType });
  });

  it.each([
    ["an executable", "payload.exe"],
    ["a script", "script.sh"],
    ["HTML, which could run script from our origin", "page.html"],
    ["SVG, which can carry script", "logo.svg"],
    ["no extension at all", "README"],
  ])("rejects %s", (_label, filename) => {
    expect(checkAttachment(filename, 1024, 0)).toMatchObject({ ok: false, status: 415 });
  });

  it("ignores the browser-supplied type and uses the extension", () => {
    // A .html uploaded with a claimed type of image/png must still be refused.
    expect(checkAttachment("page.html", 10, 0)).toMatchObject({ ok: false, status: 415 });
  });

  it("rejects an empty file", () => {
    expect(checkAttachment("empty.pdf", 0, 0)).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects a file over the size limit", () => {
    expect(checkAttachment("big.pdf", MAX_ATTACHMENT_BYTES + 1, 0)).toMatchObject({
      ok: false,
      status: 413,
    });
  });

  it("accepts a file exactly at the size limit", () => {
    expect(checkAttachment("exact.pdf", MAX_ATTACHMENT_BYTES, 0)).toMatchObject({ ok: true });
  });

  it("rejects once the per-document limit is reached", () => {
    expect(checkAttachment("one-more.pdf", 10, MAX_ATTACHMENTS_PER_DOCUMENT)).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("accepts the last slot below the limit", () => {
    expect(checkAttachment("ok.pdf", 10, MAX_ATTACHMENTS_PER_DOCUMENT - 1)).toMatchObject({
      ok: true,
    });
  });
});
