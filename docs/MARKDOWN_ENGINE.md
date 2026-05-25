# Markdown Engine (Phase 3)

## Overview

The engine has **two parallel pipelines** that share one source-of-truth doc:

1. **Live preview** — `markdown-it` running inside `src/workers/parser.worker.ts`.
   Fast, incremental, emits placeholder markup for heavy features
   (Mermaid, KaTeX) that the main thread hydrates lazily.
2. **Export / AST transforms** — `unified` (remark + rehype) in
   `src/markdown/pipeline.ts`. Used by the export pipeline (Phase 4) and any
   plugin that needs AST manipulation.

## Module map

```
src/markdown/
├── markdownIt.ts      ← live-preview parser factory
├── pipeline.ts        ← unified processor factory (export)
├── parserService.ts   ← singleton bridge to parser.worker
├── frontmatter.ts     ← YAML extraction (js-yaml)
├── sanitize.ts        ← rehype-sanitize schema
└── plugins/
    ├── sourceLine.ts  ← annotates blocks with data-source-line
    ├── math.ts        ← $…$ / $$…$$ → KaTeX placeholders
    └── mermaid.ts     ← ```mermaid → div.ink-mermaid

src/workers/
└── parser.worker.ts   ← off-thread parse + LRU cache

src/features/preview/
├── Preview.tsx        ← article shell + scrollable container
├── renderer.tsx       ← hydration (KaTeX, Shiki, Mermaid portals)
├── highlighter.ts     ← Shiki singleton, lazy language load
├── scrollSync.ts      ← editor ⇄ preview sync via data-source-line
└── components/
    └── Mermaid.tsx    ← IntersectionObserver + dynamic import

src/features/editor/
├── Editor.tsx                  ← CM6 host (creates/destroys EditorView)
├── extensions/
│   ├── markdownLang.ts         ← @codemirror/lang-markdown + language-data
│   ├── decorations.ts          ← Typora-like inline hide/dim
│   └── pasteHandlers.ts        ← image paste/drop → inkstone:image event
└── theme/
    ├── cm-light.ts
    └── cm-dark.ts
```

## Lifecycle (keystroke → rendered)

```
CM6 Transaction
   │  (updateListener)
   ▼
editor.store.updateContent(id, text)
   │
   ▼  debounce(120ms)
parserService.parse(text, rev)
   │
   ▼  postMessage
parser.worker.ts
   ├─ frontmatter.parse()
   ├─ markdown-it.render()  ← sourceLine + math + mermaid plugins active
   ├─ LRU cache by `source`
   └─ postMessage { html, lineSet, rev }
   │
   ▼  (only if rev ≥ latestRev)
preview.store.setRender({ html, lineSet, rev })
   │
   ▼  React render
Preview.tsx → Renderer
   ├─ innerHTML = sanitized html
   ├─ katex.render() over .ink-math-* nodes      (synchronous)
   ├─ Shiki highlight on visible code fences      (IntersectionObserver)
   └─ createPortal(<Mermaid/>) over .ink-mermaid  (lazy, dynamic import)
```

## Supported syntax

| Feature              | Source path                                  |
|----------------------|----------------------------------------------|
| CommonMark           | markdown-it core                             |
| GFM tables           | markdown-it core (tables enabled by default) |
| GFM task lists       | `markdown-it-task-lists`                     |
| Footnotes            | `markdown-it-footnote`                       |
| Heading anchors      | `markdown-it-anchor`                         |
| Attributes `{#id .c}`| `markdown-it-attrs`                          |
| YAML frontmatter     | `src/markdown/frontmatter.ts` (js-yaml)      |
| Inline HTML          | markdown-it `html: true`, attrs scrubbed     |
| Code fences          | markdown-it core, Shiki hydration            |
| Math $…$ / $$…$$     | `plugins/math.ts` + KaTeX hydration          |
| Mermaid              | `plugins/mermaid.ts` + `components/Mermaid`  |
| PlantUML             | hook in place; needs Kroki sidecar (Phase 4) |
| Wikilinks `[[…]]`    | reserved namespace, ADR pending              |

## Performance characteristics

- **Worker off-loads parsing** — main thread never blocks on markdown-it.
- **LRU cache (8 entries)** in the worker avoids re-parsing on tab toggles.
- **Latest-wins** in `parserService` drops stale responses.
- **Lazy hydration** — Shiki languages and Mermaid bundles only load when a
  visible block needs them; reuse across docs.
- **Viewport decorations** — CM6 inline-decoration plugin walks only
  `view.visibleRanges`; cost is O(viewport), not O(doc).
- **CodeMirror** — viewport rendering scales to 100k-line files without
  serializing the full doc.

## Security

- Attribute scrubber in `renderer.tsx` removes `on*` handlers and
  `javascript:` URIs after `innerHTML` (defense-in-depth on top of
  `markdown-it-attrs` allow-list).
- Mermaid initialized with `securityLevel: "strict"` (no HTML labels).
- Export pipeline uses `rehype-sanitize` with the schema in
  `src/markdown/sanitize.ts`.

## Extending the engine

### Add a markdown-it plugin

```ts
// src/markdown/plugins/myThing.ts
import type MarkdownIt from "markdown-it";
export function myThing(md: MarkdownIt): void {
  md.inline.ruler.after("emphasis", "my-thing", (state, silent) => { /* … */ });
}

// src/markdown/markdownIt.ts
import { myThing } from "./plugins/myThing";
md.use(myThing);
```

### Add a remark/rehype plugin (export-only)

```ts
// src/markdown/pipeline.ts
import myRemark from "remark-my-plugin";
.use(myRemark, options)
```

### Register a custom component

In `renderer.tsx`, scan for your placeholder selector (e.g. `[data-my-block]`)
and `createPortal` a React component into it, mirroring the Mermaid path.

## Editor↔Preview scroll sync

Every block-level open token receives `data-source-line="N"` from
`plugins/sourceLine.ts`. `scrollSync.ts` (Phase 4 wiring in `WorkspaceView`)
maps editor viewport line → nearest preview node and vice-versa with
re-entrancy guards.

## Known limitations / future work

- Block-level **incremental reparse**: current worker reparses the whole
  document. Per-block hashing is designed (ADR) and slots into the existing
  worker without API change.
- PlantUML / Graphviz: design accommodates them via the same
  `createPortal` path; Kroki sidecar integration is Phase 4.
- WYSIWYG: `decorations.ts` provides line-aware hiding for `**`, `*`,
  `` ` ``, and link markers. Heading and list markers are dimmed but kept
  visible by design.
