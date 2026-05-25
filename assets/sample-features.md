---
title: Inkstone — Feature Tour
author: Inkstone
tags: [demo, markdown]
---

# Feature Tour

A reference document exercising the full markdown engine.

## Inline formatting

Bold **strong**, *italic*, ***both***, ~~strikethrough~~, `inline code`,
and a [link to Tauri](https://tauri.app).

## Lists

- unordered item
  - nested
    - deeply nested
- another item

1. ordered
2. items
3. with content

### Task list

- [x] Implement parser
- [x] Wire CodeMirror 6
- [ ] Plugin marketplace
- [ ] Real-time collaboration

## Blockquotes

> "Markdown is plain text that doesn't get in your way."
>
> — anonymous

## Tables (GFM)

| Feature       | Status | Notes                          |
|---------------|:------:|--------------------------------|
| CommonMark    |  done  | via markdown-it                |
| GFM tables    |  done  | rendered above                 |
| KaTeX         |  done  | inline `$E=mc^2$` and block    |
| Mermaid       |  done  | flowcharts, sequence, class    |
| Shiki         |  done  | lazy per-language registration |

## Footnotes

Here is a statement[^1]. Footnotes resolve to anchored references[^longer].

[^1]: A short footnote.
[^longer]: A longer footnote that spans multiple lines.

    It can contain its own paragraphs.

## Inline HTML

<div style="padding:0.5rem; border:1px solid var(--ink-border); border-radius:6px">
  Inline HTML is allowed but sanitized.
</div>

## Code fences

```ts
export interface Doc {
  id: string;
  content: string;
}
```

```python
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

## Horizontal rule

---

End of tour.
