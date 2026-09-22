import { describe, expect, it } from "vitest";
import { deriveTitleFromFilename, MAX_TITLE_LENGTH, normalizeTitle, UNTITLED_TITLE } from "./title";

describe("normalizeTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeTitle("  Q3   planning \n notes ")).toBe("Q3 planning notes");
  });

  it("falls back to a default when the title is empty or whitespace", () => {
    expect(normalizeTitle("")).toBe(UNTITLED_TITLE);
    expect(normalizeTitle("   \t\n ")).toBe(UNTITLED_TITLE);
  });

  it("caps the length without leaving a trailing space", () => {
    const title = normalizeTitle("a".repeat(MAX_TITLE_LENGTH - 1) + " bbbb");
    expect(title).toHaveLength(MAX_TITLE_LENGTH - 1);
    expect(title.endsWith(" ")).toBe(false);
  });
});

describe("deriveTitleFromFilename", () => {
  it("drops the extension", () => {
    expect(deriveTitleFromFilename("Q3 Planning.docx")).toBe("Q3 Planning");
  });

  it("drops a directory prefix from either path separator", () => {
    expect(deriveTitleFromFilename("notes/drafts/roadmap.md")).toBe("roadmap");
    expect(deriveTitleFromFilename(String.raw`notes\drafts\roadmap.md`)).toBe("roadmap");
  });

  it("keeps dots that are part of the name", () => {
    expect(deriveTitleFromFilename("v1.2 spec.txt")).toBe("v1.2 spec");
  });

  it("falls back for a dotfile with no stem", () => {
    expect(deriveTitleFromFilename(".gitignore")).toBe(UNTITLED_TITLE);
  });
});
