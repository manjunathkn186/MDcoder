import { exportHtml } from "./exporters/html";
import type { ExportContext } from "./types";
import { logger } from "@lib/logger";

/**
 * Print the current document via the browser print dialog.
 *
 * We render the same self-contained HTML used by the HTML exporter, mount
 * it into a sandboxed `.ink-print` container while temporarily hiding the
 * application root, and call `window.print()`. The OS print dialog then
 * routes to either a physical printer or the platform's "Save as PDF".
 *
 * After the dialog closes the application UI is restored.
 */
export async function printDocument(ctx: ExportContext): Promise<void> {
  const html = exportHtml({ ...ctx, options: { ...ctx.options, format: "html" } }).data as string;

  // Extract body innerHTML from the standalone doc.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const innerHtml = bodyMatch?.[1] ?? html;

  const container = document.createElement("div");
  container.className = "ink-print";
  container.innerHTML = innerHtml;
  document.body.appendChild(container);

  const root = document.getElementById("root");
  const prevDisplay = root?.style.display ?? "";
  if (root) root.style.display = "none";

  const cleanup = () => {
    if (root) root.style.display = prevDisplay;
    container.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup, { once: true });

  try {
    // Give the browser a tick to paint before opening the dialog.
    await new Promise((r) => window.setTimeout(r, 50));
    window.print();
  } catch (err) {
    logger.warn("[print] window.print failed", err);
    cleanup();
    throw err;
  }
}
