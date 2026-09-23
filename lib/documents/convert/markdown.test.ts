import { describe, expect, it } from "vitest";
import { documentToPlainText, type DocumentContent } from "../content";
import { documentToMarkdown, markdownToDocument } from "./markdown";

describe("markdownToDocument", () => {
  it("maps headings to heading nodes with their level", () => {
    const doc = markdownToDocument("# One\n\n## Two\n\n### Three\n");
    expect(doc.content?.map((node) => [node.type, node.attrs?.level])).toEqual([
      ["heading", 1],
      ["heading", 2],
      ["heading", 3],
    ]);
  });

  it("preserves inline marks", () => {
    const doc = markdownToDocument("Some **bold** and *italic* and ~~struck~~ text.");
    const marks = doc.content?.[0]?.content?.flatMap((node) =>
      (node.marks ?? []).map((mark) => mark.type),
    );
    expect(marks).toEqual(["bold", "italic", "strike"]);
  });

  it("distinguishes bulleted from numbered lists", () => {
    const doc = markdownToDocument("- a\n- b\n\n1. one\n2. two\n");
    expect(doc.content?.map((node) => node.type)).toEqual(["bulletList", "orderedList"]);
  });

  it("keeps link hrefs", () => {
    const doc = markdownToDocument("[example](https://example.com)");
    const link = doc.content?.[0]?.content?.[0]?.marks?.find((mark) => mark.type === "link");
    expect(link?.attrs?.href).toBe("https://example.com");
  });

  it("drops script tags rather than storing them", () => {
    const doc = markdownToDocument("Hello\n\n<script>alert(1)</script>\n");
    expect(JSON.stringify(doc)).not.toContain("alert");
  });

  it("never returns a document with no place to put the cursor", () => {
    expect(markdownToDocument("").content?.length).toBeGreaterThan(0);
  });
});

describe("documentToMarkdown", () => {
  const doc: DocumentContent = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "A " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: " word." },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }],
          },
        ],
      },
    ],
  };

  it("writes headings, marks and lists", () => {
    expect(documentToMarkdown(doc)).toBe("## Notes\n\nA **bold** word.\n\n- one\n- two\n");
  });

  it("numbers ordered lists from one", () => {
    const ordered: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: ["first", "second", "third"].map((text) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          })),
        },
      ],
    };
    expect(documentToMarkdown(ordered)).toBe("1. first\n2. second\n3. third\n");
  });

  it("escapes characters that would otherwise be read as markup", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "5 * 3 and _underscores_" }] },
      ],
    };
    expect(documentToMarkdown(doc)).toBe("5 \* 3 and \_underscores\_\n");
  });

  it("does not escape inside inline code", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a_b*c", marks: [{ type: "code" }] }],
        },
      ],
    };
    expect(documentToMarkdown(doc)).toBe("`a_b*c`\n");
  });

  it("renders a link around its text", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "example",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };
    expect(documentToMarkdown(doc)).toBe("[example](https://example.com)\n");
  });

  it("prefixes every line of a blockquote", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "quoted" }] }],
        },
      ],
    };
    expect(documentToMarkdown(doc)).toBe("> quoted\n");
  });
});

describe("round trip", () => {
  // Import and export check each other: whatever markdown survives a trip
  // through the document shape must come back out the same way a second time.
  const source = [
    "# Release notes",
    "",
    "A paragraph with **bold**, *italic* and ~~struck~~ text.",
    "",
    "## Highlights",
    "",
    "- first item",
    "- second item",
    "",
    "1. step one",
    "2. step two",
    "",
    "> A quoted line.",
    "",
    "[the link](https://example.com)",
    "",
  ].join("\n");

  it("is stable: markdown -> document -> markdown -> document -> markdown", () => {
    const once = documentToMarkdown(markdownToDocument(source));
    const twice = documentToMarkdown(markdownToDocument(once));
    expect(twice).toBe(once);
  });

  it("preserves the visible text", () => {
    const doc = markdownToDocument(source);
    const text = documentToPlainText(doc);
    expect(text).toContain("Release notes");
    expect(text).toContain("A paragraph with bold, italic and struck text.");
    expect(text).toContain("first item");
    expect(text).toContain("step two");
  });

  it("preserves structure through the round trip", () => {
    const roundTripped = markdownToDocument(documentToMarkdown(markdownToDocument(source)));
    expect(roundTripped.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "blockquote",
      "paragraph",
    ]);
  });
});
