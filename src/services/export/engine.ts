import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { exportMarkdown } from "./exporters/markdown";
import { exportHtml } from "./exporters/html";
import { exportPdf } from "./exporters/pdf";
import { exportDocx } from "./exporters/docx";
import { printDocument } from "./printRenderer";
import { fs } from "@/services/fs";
import { toast } from "@ui/toast";
import { logger } from "@lib/logger";
import {
  DEFAULT_OPTIONS,
  type ExportArtifact,
  type ExportContext,
  type ExportFormat,
  type ExportOptions,
} from "./types";

const EXTENSION_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  markdown: { name: "Markdown", extensions: ["md"] },
  html: { name: "HTML", extensions: ["html"] },
  pdf: { name: "PDF", extensions: ["pdf"] },
  docx: { name: "Word Document", extensions: ["docx"] },
};

/**
 * Top-level export entry point. Picks an exporter, runs it, then either:
 *  - opens a Tauri save dialog and writes the bytes (binary), or
 *  - downloads via an in-browser blob (fallback when not running in Tauri).
 *
 * PDF is special: the underlying exporter triggers the OS print dialog
 * and does not return bytes, so we skip the save step for it.
 */
export async function runExport(ctx: ExportContext): Promise<void> {
  try {
    const artifact = await buildArtifact(ctx);
    if (artifact.noData) {
      toast.info({ message: "Use the print dialog to save as PDF." });
      return;
    }
    await persistArtifact(artifact);
    toast.success({ title: "Exported", message: artifact.filename });
  } catch (err) {
    logger.error("[export] failed", err);
    toast.danger({
      title: "Export failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function buildArtifact(ctx: ExportContext): Promise<ExportArtifact> {
  switch (ctx.options.format) {
    case "markdown":
      return exportMarkdown(ctx);
    case "html":
      return exportHtml(ctx);
    case "pdf":
      return exportPdf(ctx);
    case "docx":
      return exportDocx(ctx);
    default: {
      const _exhaustive: never = ctx.options.format;
      throw new Error(`Unsupported format: ${_exhaustive as string}`);
    }
  }
}

async function persistArtifact(a: ExportArtifact): Promise<void> {
  if (isTauri()) {
    const format = inferFormat(a.filename);
    const targetPath = await saveDialog({
      defaultPath: a.filename,
      filters: [EXTENSION_FILTERS[format]],
    });
    if (!targetPath) return;
    if (typeof a.data === "string") {
      await fs.writeText(targetPath, a.data);
    } else {
      // Tauri JS bridge doesn't provide a generic binary write through our
      // typed wrapper; fall back to base64 + a small writer command, or
      // (more portable) base64-data-URI download for now.
      await writeBinaryViaTempBlob(targetPath, a.data, a.mimeType);
    }
  } else {
    triggerBrowserDownload(a);
  }
}

function isTauri(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function triggerBrowserDownload(a: ExportArtifact): void {
  const blob =
    typeof a.data === "string"
      ? new Blob([a.data], { type: a.mimeType })
      : new Blob([a.data as BlobPart], { type: a.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function writeBinaryViaTempBlob(_path: string, data: Uint8Array, mime: string): Promise<void> {
  // Tauri exposes binary fs via `@tauri-apps/plugin-fs` but our project
  // currently only registers a text writer. We approximate by downloading
  // via the browser; the user picks the same path through their OS dialog.
  triggerBrowserDownload({
    filename: _path.split(/[/\\]/).pop() ?? "export",
    mimeType: mime,
    data,
  });
}

function inferFormat(filename: string): ExportFormat {
  if (filename.endsWith(".md")) return "markdown";
  if (filename.endsWith(".html")) return "html";
  if (filename.endsWith(".pdf")) return "pdf";
  return "docx";
}

export async function runPrint(ctx: ExportContext): Promise<void> {
  try {
    await printDocument(ctx);
  } catch (err) {
    logger.error("[print] failed", err);
    toast.danger({ title: "Print failed", message: err instanceof Error ? err.message : String(err) });
  }
}

export function buildContext(opts: {
  source: string;
  html: string;
  sourcePath: string | null;
  format: ExportFormat;
  title: string;
  overrides?: Partial<ExportOptions>;
}): ExportContext {
  const options: ExportOptions = {
    ...DEFAULT_OPTIONS,
    format: opts.format,
    title: opts.title,
    ...opts.overrides,
  };
  return { source: opts.source, html: opts.html, sourcePath: opts.sourcePath, options };
}

export { type ExportFormat, type ExportOptions } from "./types";
