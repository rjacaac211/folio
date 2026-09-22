import { describe, expect, it } from "vitest";
import {
  createEmptyDocument,
  documentExcerpt,
  documentToPlainText,
  isDocumentContent,
  MAX_CONTENT_DEPTH,
  type DocumentContent,
} from "./content";

const sample: DocumentContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Q3 Planning" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "We shipped " },
        { type: "text", text: "three things", marks: [{ type: "bold" }] },
        { type: "text", text: " this quarter." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Onboarding rewrite" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Billing migration" }] }],
        },
      ],
    },
  ],
};

describe("isDocumentContent", () => {
  it("accepts a well-formed document", () => {
    expect(isDocumentContent(sample)).toBe(true);
    expect(isDocumentContent(createEmptyDocument())).toBe(true);
  });

  it("accepts a doc with no content array", () => {
    expect(isDocumentContent({ type: "doc" })).toBe(true);
  });

  it("accepts unknown node types, so new editor extensions do not need a server change", () => {
    expect(isDocumentContent({ type: "doc", content: [{ type: "tableOfContents" }] })).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "doc"],
    ["a number", 7],
    ["the wrong root type", { type: "paragraph" }],
    ["a non-array content", { type: "doc", content: "nope" }],
    ["a node without a type", { type: "doc", content: [{ text: "hi" }] }],
    ["a node with an empty type", { type: "doc", content: [{ type: "" }] }],
    ["a non-string text field", { type: "doc", content: [{ type: "text", text: 42 }] }],
    ["a malformed mark", { type: "doc", content: [{ type: "text", text: "x", marks: [{}] }] }],
    ["non-array marks", { type: "doc", content: [{ type: "text", text: "x", marks: {} }] }],
  ])("rejects %s", (_label, value) => {
    expect(isDocumentContent(value)).toBe(false);
  });

  it("rejects nesting deeper than the cap", () => {
    let node: Record<string, unknown> = { type: "text", text: "deep" };
    for (let i = 0; i < MAX_CONTENT_DEPTH + 5; i += 1) {
      node = { type: "blockquote", content: [node] };
    }
    expect(isDocumentContent({ type: "doc", content: [node] })).toBe(false);
  });

  it("accepts nesting just inside the cap", () => {
    let node: Record<string, unknown> = { type: "text", text: "deep" };
    for (let i = 0; i < 10; i += 1) {
      node = { type: "blockquote", content: [node] };
    }
    expect(isDocumentContent({ type: "doc", content: [node] })).toBe(true);
  });
});

describe("documentToPlainText", () => {
  it("emits one line per block and unwraps list items", () => {
    expect(documentToPlainText(sample)).toBe(
      [
        "Q3 Planning",
        "We shipped three things this quarter.",
        "Onboarding rewrite",
        "Billing migration",
      ].join("\n"),
    );
  });

  it("joins adjacent text nodes without inserting spaces", () => {
    const doc: DocumentContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "un" },
            { type: "text", text: "split" },
          ],
        },
      ],
    };
    expect(documentToPlainText(doc)).toBe("unsplit");
  });

  it("returns an empty string for an empty document", () => {
    expect(documentToPlainText(createEmptyDocument())).toBe("");
  });
});

describe("documentExcerpt", () => {
  it("collapses to a single line", () => {
    expect(documentExcerpt(sample, 40)).toBe("Q3 Planning We shipped three things this…");
  });

  it("leaves short content unchanged and unsuffixed", () => {
    expect(documentExcerpt(sample)).not.toContain("…");
  });
});
