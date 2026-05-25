import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

/**
 * Sanitize schema extended to allow markdown-engine-specific output
 * (KaTeX, Mermaid placeholders, task-list checkboxes, source-line attrs).
 *
 * This is consumed by the export pipeline (`pipeline.ts`). The live preview
 * goes through DOMPurify-equivalent attribute filtering at hydration time.
 */
export const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "id",
      ["data*"],
      ["aria*"],
    ],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      ["type", "checkbox"],
      "checked",
      "disabled",
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "className",
      ["data*"],
      "style",
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      "className",
      ["data*"],
      "style",
    ],
    code: [...(defaultSchema.attributes?.code ?? []), "className", ["data*"]],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className", ["data*"]],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "target",
      "rel",
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "section", "math", "svg", "g", "path"],
};
