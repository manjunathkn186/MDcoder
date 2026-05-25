/**
 * Public types for the export subsystem.
 * Each exporter (`markdown`, `html`, `pdf`, `docx`) accepts an
 * `ExportContext` and returns an `ExportArtifact` describing the
 * produced bytes (or a side-effect like a print dialog).
 */
export type ExportFormat = "markdown" | "html" | "pdf" | "docx";

export interface ExportOptions {
  format: ExportFormat;
  title: string;
  /** Inline all assets / styles for portability when true. */
  embedAssets: boolean;
  /** Include a generated table of contents at the top. */
  includeToc: boolean;
  /** Include the YAML frontmatter (Markdown export only). */
  includeFrontmatter: boolean;
  /** Optional author / date metadata for headers / DOCX core props. */
  author?: string;
  date?: string;
}

export interface ExportContext {
  /** The raw markdown source (with frontmatter intact). */
  source: string;
  /** Pre-rendered HTML body (without <html> wrapper). May be empty; if
   *  empty, exporters must render from `source`. */
  html: string;
  /** Absolute filesystem path of the source document, if any. */
  sourcePath: string | null;
  options: ExportOptions;
}

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  /** Raw bytes for binary formats (pdf/docx) or text for text formats. */
  data: Uint8Array | string;
  /** Some formats (like print) return no bytes — only a side effect. */
  noData?: boolean;
}

export const DEFAULT_OPTIONS: Omit<ExportOptions, "format" | "title"> = {
  embedAssets: true,
  includeToc: false,
  includeFrontmatter: true,
};
