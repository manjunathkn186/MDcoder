import { useEffect, useMemo, useState } from "react";
import { Modal } from "@ui/Modal";
import { Button } from "@ui/Button";
import { useExportUi } from "@state/export.store";
import { useEditor } from "@state/editor.store";
import { buildContext, runExport, runPrint } from "@/services/export/engine";
import { parseFrontmatter } from "@/markdown/frontmatter";
import { basename } from "@/services/fs";
import { cn } from "@lib/cn";
import { FileText, FileCode, FileType, FileDown, Printer } from "lucide-react";
import type { ExportFormat } from "@/services/export/types";

interface FormatMeta {
  id: ExportFormat;
  name: string;
  description: string;
  icon: typeof FileText;
}

const FORMATS: FormatMeta[] = [
  { id: "markdown", name: "Markdown", description: "Plain .md source", icon: FileText },
  { id: "html",     name: "HTML",     description: "Self-contained .html with inline styles", icon: FileCode },
  { id: "pdf",      name: "PDF",      description: "Native print dialog with Save as PDF", icon: FileDown },
  { id: "docx",     name: "Word",     description: ".docx via pure-JS converter", icon: FileType },
];

/**
 * Export dialog. Lets the user pick a format and tweak options, then
 * routes through the export engine. Print is a separate action since
 * it bypasses the save dialog.
 */
export function ExportDialog(): JSX.Element {
  const open = useExportUi((s) => s.open);
  const close = useExportUi((s) => s.close);
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [includeToc, setIncludeToc] = useState(false);
  const [embedAssets, setEmbedAssets] = useState(true);
  const [includeFrontmatter, setIncludeFrontmatter] = useState(true);
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);

  const defaultTitle = useMemo(() => {
    if (!doc) return "Untitled";
    const fm = parseFrontmatter(doc.content);
    if (typeof fm.data.title === "string") return fm.data.title;
    if (doc.path) return basename(doc.path).replace(/\.[^.]+$/, "");
    return doc.title || "Untitled";
  }, [doc]);
  const [title, setTitle] = useState(defaultTitle);
  useEffect(() => setTitle(defaultTitle), [defaultTitle]);

  const submit = async (action: "export" | "print") => {
    if (!doc) return;
    setBusy(true);
    try {
      // The HTML/PDF exporters render from `source` when `html` is empty,
      // using the same markdown-it pipeline as the live preview.
      const ctx = buildContext({
        source: doc.content,
        html: "",
        sourcePath: doc.path,
        format,
        title,
        overrides: { embedAssets, includeToc, includeFrontmatter, author: author || undefined },
      });
      if (action === "print") await runPrint(ctx);
      else await runExport(ctx);
      close();
    } finally {
      setBusy(false);
    }
  };

  if (!doc) {
    return (
      <Modal open={open} onClose={close} title="Export" size="sm">
        <p className="text-sm text-muted">Open a document first.</p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Export document"
      description={doc.path ?? "Unsaved buffer"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => submit("print")} disabled={busy} loading={busy}>
            <Printer size={14} /> Print
          </Button>
          <Button variant="primary" onClick={() => submit("export")} disabled={busy} loading={busy}>
            Export
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm focus:ring-1 focus:ring-accent"
          />
        </Field>

        <Field label="Format">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FORMATS.map(({ id, name, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormat(id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors duration-fast",
                  format === id
                    ? "border-accent ring-2 ring-accent ring-offset-1 ring-offset-bg bg-accent-soft"
                    : "border-border hover:border-border-strong hover:bg-surface-2",
                )}
                aria-pressed={format === id}
              >
                <Icon size={16} className={format === id ? "text-accent" : "text-muted"} />
                <div className="text-sm font-medium">{name}</div>
                <div className="text-[11px] text-muted">{description}</div>
              </button>
            ))}
          </div>
        </Field>

        {(format === "html" || format === "docx") && (
          <Field label="Author">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm"
            />
          </Field>
        )}

        <Field label="Options">
          <div className="grid gap-2">
            <Check label="Include table of contents" checked={includeToc} onChange={setIncludeToc} disabled={format === "markdown"} />
            <Check label="Embed assets / inline styles" checked={embedAssets} onChange={setEmbedAssets} disabled={format === "markdown" || format === "docx"} />
            <Check label="Include YAML frontmatter (markdown only)" checked={includeFrontmatter} onChange={setIncludeFrontmatter} disabled={format !== "markdown"} />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <label className={cn("flex items-center gap-2 text-sm", disabled && "opacity-50")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}
