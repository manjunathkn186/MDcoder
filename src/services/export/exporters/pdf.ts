import type { ExportArtifact, ExportContext } from "../types";
import { exportHtml } from "./html";
import { slugify } from "./markdown";
import { logger } from "@lib/logger";

/**
 * PDF export.
 *
 * Strategy: we build a self-contained HTML document (the same one used by
 * the HTML exporter), open it in a hidden window, and invoke the browser
 * print dialog with PDF preselected when supported. In the Tauri shell
 * this routes to the platform's native print dialog where "Save as PDF"
 * is the default destination on macOS and a built-in option on Windows /
 * Linux through the Chromium webview.
 *
 * Returns `noData: true` because the bytes are written by the OS print
 * pipeline, not by us.
 */
export async function exportPdf(ctx: ExportContext): Promise<ExportArtifact> {
  const html = exportHtml({
    ...ctx,
    options: { ...ctx.options, format: "html", embedAssets: true },
  }).data as string;

  await printHtmlDocument(html, ctx.options.title);

  return {
    filename: `${slugify(ctx.options.title)}.pdf`,
    mimeType: "application/pdf",
    data: new Uint8Array(),
    noData: true,
  };
}

async function printHtmlDocument(html: string, title: string): Promise<void> {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!win) {
    logger.warn("[export/pdf] popup blocked");
    throw new Error("Unable to open print window. Please allow popups.");
  }
  win.document.open();
  win.document.write(html);
  win.document.title = title;
  win.document.close();

  await new Promise<void>((resolve) => {
    const onReady = () => {
      win.removeEventListener("load", onReady);
      // Give layout a moment to settle before printing.
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (err) {
          logger.warn("[export/pdf] print failed", err);
        }
        resolve();
      }, 80);
    };
    if (win.document.readyState === "complete") onReady();
    else win.addEventListener("load", onReady);
  });
}
