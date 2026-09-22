import StarterKit from "@tiptap/starter-kit";

/**
 * StarterKit registers these extensions at runtime, but its type definitions only
 * import their *options* types — never the modules themselves. The commands they
 * add (`toggleBold`, `toggleBulletList`, …) are declared through module
 * augmentation of `@tiptap/core`, and TypeScript only applies an augmentation from
 * a module that is actually part of the program.
 *
 * Under pnpm's strict node_modules those packages are not even resolvable unless
 * they are declared as direct dependencies, so without this the toolbar would call
 * commands that work at runtime but do not typecheck.
 *
 * `import type {}` loads the declarations and is erased entirely at build time.
 */
import type {} from "@tiptap/extension-blockquote";
import type {} from "@tiptap/extension-bold";
import type {} from "@tiptap/extension-italic";
import type {} from "@tiptap/extension-list";
import type {} from "@tiptap/extension-strike";
import type {} from "@tiptap/extension-underline";

/**
 * The editor's feature set, in one place.
 *
 * Anything not listed here is deliberately absent: the menus only expose commands
 * that exist, so this list and the toolbar stay in step.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
];
