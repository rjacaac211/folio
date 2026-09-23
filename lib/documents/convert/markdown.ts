import { marked } from "marked";
import type { DocumentContent, DocumentNode, Mark } from "../content";
import { htmlToDocument } from "./html";

/** Markdown in, via HTML, so the editor's own schema decides what is kept. */
export function markdownToDocument(markdown: string): DocumentContent {
  const html = marked.parse(markdown, { async: false, gfm: true });
  return htmlToDocument(html);
}

const MARK_WRAPPERS: Record<string, string> = {
  bold: "**",
  italic: "*",
  strike: "~~",
  code: "`",
};

/**
 * Escapes characters that would otherwise be read as markup.
 *
 * Deliberately conservative: escaping every special character produces noisy,
 * unreadable output, so this only covers the ones that actually change meaning
 * in running text.
 */
function escapeText(text: string): string {
  return text.replace(/([\`*_[\]])/g, "\$1");
}

function applyMarks(text: string, marks: Mark[] | undefined): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  const link = marks.find((mark) => mark.type === "link");

  // Inline code is literal, so its content must not also be escaped as markup.
  const isCode = marks.some((mark) => mark.type === "code");
  if (isCode) result = text;

  for (const mark of marks) {
    const wrapper = MARK_WRAPPERS[mark.type];
    if (!wrapper || mark.type === "code") continue;
    result = `${wrapper}${result}${wrapper}`;
  }

  if (isCode) result = `\`${result}\``;

  if (link) {
    const href = typeof link.attrs?.href === "string" ? link.attrs.href : "";
    result = `[${result}](${href})`;
  }

  return result;
}

function inlineToMarkdown(nodes: DocumentNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (typeof node.text === "string") {
        const isCode = node.marks?.some((mark) => mark.type === "code");
        return applyMarks(isCode ? node.text : escapeText(node.text), node.marks);
      }
      return inlineToMarkdown(node.content);
    })
    .join("");
}

function listToMarkdown(node: DocumentNode, ordered: boolean, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  (node.content ?? []).forEach((item, index) => {
    const marker = ordered ? `${index + 1}.` : "-";
    const blocks = item.content ?? [];

    blocks.forEach((block, blockIndex) => {
      if (block.type === "bulletList" || block.type === "orderedList") {
        lines.push(...listToMarkdown(block, block.type === "orderedList", depth + 1));
        return;
      }
      const text = inlineToMarkdown(block.content);
      // Only the first block of a list item carries the marker; the rest are
      // continuation lines indented to line up beneath it.
      lines.push(blockIndex === 0 ? `${indent}${marker} ${text}` : `${indent}  ${text}`);
    });
  });

  return lines;
}

function blockToMarkdown(node: DocumentNode, depth = 0): string {
  switch (node.type) {
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${inlineToMarkdown(node.content)}`;
    }
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "bulletList":
      return listToMarkdown(node, false, depth).join("\n");
    case "orderedList":
      return listToMarkdown(node, true, depth).join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((child) => blockToMarkdown(child, depth))
        .join("\n\n")
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n");
    case "codeBlock": {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      const body = (node.content ?? []).map((child) => child.text ?? "").join("");
      return `\`\`\`${language}\n${body}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    default:
      return inlineToMarkdown(node.content);
  }
}

/** Markdown out, for `File → Download as Markdown`. */
export function documentToMarkdown(content: DocumentContent): string {
  const blocks = (content.content ?? [])
    .map((node) => blockToMarkdown(node))
    .filter((block) => block.trim() !== "");

  return blocks.join("\n\n").trim() + "\n";
}
