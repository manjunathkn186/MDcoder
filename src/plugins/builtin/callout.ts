/**
 * Built-in plugin: GitHub-style callouts.
 *
 *   > [!NOTE]
 *   > Useful information.
 *
 *   > [!WARNING]
 *   > Caution.
 *
 * Renders as a styled blockquote with a labeled header.
 *
 * Permission: markdown (trusted only).
 */
import type { PluginManifest } from "@/plugins/sdk/manifest";
import type { PluginModule } from "@/plugins/sdk/api";

export const manifest: PluginManifest = {
  id: "callout",
  name: "Callouts",
  version: "1.0.0",
  description: "GitHub-style `> [!NOTE]` / WARNING / TIP callouts in preview.",
  author: "Inkstone",
  main: "callout.ts",
  permissions: ["markdown"],
  category: "preview",
  trusted: true,
};

const TYPES: Record<string, { label: string; cls: string }> = {
  note:    { label: "Note",    cls: "ink-callout ink-callout-note" },
  tip:     { label: "Tip",     cls: "ink-callout ink-callout-tip" },
  warning: { label: "Warning", cls: "ink-callout ink-callout-warning" },
  danger:  { label: "Danger",  cls: "ink-callout ink-callout-danger" },
  info:    { label: "Info",    cls: "ink-callout ink-callout-info" },
};

export const plugin: PluginModule = {
  activate(api) {
    if (!api.markdown) throw new Error("markdown permission missing");
    return api.markdown.use((md: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = md as any;
      const defaultRender =
        m.renderer.rules.blockquote_open ||
        ((tokens: unknown[], idx: number, opts: unknown, _env: unknown, self: { renderToken: (t: unknown[], i: number, o: unknown) => string }) =>
          self.renderToken(tokens, idx, opts));

      m.renderer.rules.blockquote_open = function (
        tokens: { content?: string; meta?: { callout?: { label: string; cls: string } } }[],
        idx: number,
        opts: unknown,
        env: unknown,
        self: { renderToken: (t: unknown[], i: number, o: unknown) => string },
      ): string {
        const next = tokens[idx + 1];
        const paragraphOpen = next;
        const inline = tokens[idx + 2] as { content?: string; children?: { content?: string }[] } | undefined;
        const text = inline?.content ?? "";
        const match = text.match(/^\[!(\w+)\]\s*(.*)$/i);
        if (match) {
          const kind = match[1].toLowerCase();
          const meta = TYPES[kind] ?? TYPES.note;
          // Strip the `[!KIND]` token from the rendered content.
          if (inline) {
            inline.content = match[2];
            if (inline.children && inline.children[0]) {
              inline.children[0].content = match[2];
            }
          }
          paragraphOpen && (paragraphOpen.meta = { callout: meta });
          return `<aside class="${meta.cls}"><div class="ink-callout-title">${meta.label}</div>`;
        }
        return defaultRender(tokens, idx, opts, env, self);
      };

      const defaultClose =
        m.renderer.rules.blockquote_close ||
        ((t: unknown[], i: number, o: unknown, _env: unknown, self: { renderToken: (t: unknown[], i: number, o: unknown) => string }) =>
          self.renderToken(t, i, o));

      m.renderer.rules.blockquote_close = function (
        tokens: { meta?: { callout?: unknown } }[],
        idx: number,
        opts: unknown,
        env: unknown,
        self: { renderToken: (t: unknown[], i: number, o: unknown) => string },
      ): string {
        // Look back to find a paragraph_open with the callout meta.
        for (let k = idx - 1; k >= 0; k--) {
          const t = tokens[k];
          if (t?.meta?.callout) return `</aside>`;
        }
        return defaultClose(tokens, idx, opts, env, self);
      };
    });
  },
};
