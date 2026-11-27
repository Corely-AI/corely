import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  moveSignField,
  SignFieldTypeSchema,
  SignLayoutSchema,
  type SignField,
  type SignLayout,
} from "@corely/contracts";
import { Button, Card } from "@corely/ui";

const control = "min-w-0 max-w-full rounded-md border bg-background px-3 py-2";

export function SignEditorControls({
  filename,
  archived,
  layout,
  role,
  type,
  field,
  preview,
  dirty,
  onRoleChange,
  onTypeChange,
  onPreviewChange,
  onAddField,
  onSelectField,
  onUpdateField,
  onEditLayout,
  onSaveLayout,
  onRestoreLayout,
  onError,
  children,
}: {
  filename?: string;
  archived?: boolean;
  layout: SignLayout;
  role: string;
  type: SignField["type"];
  field?: SignField;
  preview: boolean;
  dirty: boolean;
  onRoleChange: (role: string) => void;
  onTypeChange: (type: SignField["type"]) => void;
  onPreviewChange: (preview: boolean) => void;
  onAddField: () => void;
  onSelectField: (id: string) => void;
  onUpdateField: (field: SignField) => void;
  onEditLayout: (layout: SignLayout) => void;
  onSaveLayout: () => void;
  onRestoreLayout: (layout: SignLayout) => void;
  onError: (message: string) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const label = (name: string) => t("sign." + name);

  function downloadLayout() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sign-layout.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onSaveLayout();
  }

  async function restoreLayout(file: File) {
    if (dirty && !window.confirm(t("sign.replace"))) {
      return;
    }
    try {
      if (file.size > 512000) {
        throw Error();
      }
      const restored = SignLayoutSchema.parse(JSON.parse(await file.text()));
      if (
        restored.document.sha256 !== layout.document.sha256 ||
        restored.document.pageCount !== layout.document.pageCount
      ) {
        throw Error();
      }
      onRestoreLayout(restored);
    } catch {
      onError("Choose a valid layout saved for this PDF.");
    }
  }

  return (
    <Card className="min-w-0 p-4">
      <fieldset disabled={archived} className="min-w-0 space-y-4">
        <p className="font-semibold [overflow-wrap:anywhere]">{filename}</p>
        {children}
        <label className="grid grid-cols-1 gap-1">
          {t("sign.signerRole")}
          <select className={control} value={role} onChange={(e) => onRoleChange(e.target.value)}>
            {layout.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => {
            const id = crypto.randomUUID();
            onEditLayout({
              ...layout,
              roles: [
                ...layout.roles,
                { id, name: t("sign.signer") + " " + (layout.roles.length + 1) },
              ],
            });
            if (layout.roles.length < 20) {
              onRoleChange(id);
            }
          }}
        >
          {t("sign.addRole")}
        </Button>
        <label className="grid grid-cols-1 gap-1">
          {t("sign.fieldType")}
          <select
            className={control}
            value={type}
            onChange={(e) => onTypeChange(SignFieldTypeSchema.parse(e.target.value))}
          >
            {SignFieldTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={preview || layout.fields.length >= 250} onClick={() => onAddField()}>
          {t("sign.addField")}
        </Button>
        <label className="block">
          <input
            type="checkbox"
            checked={preview}
            onChange={(e) => onPreviewChange(e.target.checked)}
          />{" "}
          Preview selected role
        </label>
        {field && (
          <fieldset className="grid min-w-0 grid-cols-2 gap-2">
            <legend className="mb-2 font-semibold">
              {t("sign.placement", { type: label(field.type) })}
            </legend>
            <label className="col-span-2 grid grid-cols-1 gap-1">
              {t("sign.selectedFieldType")}
              <select
                className={control}
                value={field.type}
                onChange={(e) =>
                  onUpdateField({ ...field, type: SignFieldTypeSchema.parse(e.target.value) })
                }
              >
                {SignFieldTypeSchema.options.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key}>
                {label(key)} (%)
                <input
                  className={control + " w-full"}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={Number((field.rect[key] * 100).toFixed(2))}
                  onChange={(e) =>
                    onUpdateField({
                      ...field,
                      rect: { ...field.rect, [key]: e.target.valueAsNumber / 100 },
                    })
                  }
                />
              </label>
            ))}
            <label className="col-span-2 grid grid-cols-1 gap-1">
              {t("sign.assigned")}
              <select
                className={control}
                value={field.roleId}
                onChange={(e) => onUpdateField({ ...field, roleId: e.target.value })}
              >
                {layout.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="h-auto min-h-11 whitespace-normal"
              variant="outline"
              disabled={layout.fields.length >= 250}
              onClick={() => {
                const copy = {
                  ...field,
                  id: crypto.randomUUID(),
                  rect: moveSignField(field.rect, 0.02, 0.02),
                };
                onEditLayout({ ...layout, fields: [...layout.fields, copy] });
                onSelectField(copy.id);
              }}
            >
              {t("sign.duplicate")}
            </Button>
            <label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdateField({ ...field, required: e.target.checked })}
              />{" "}
              Required
            </label>
            <Button
              className="h-auto min-h-11 whitespace-normal"
              variant="outline"
              onClick={() => {
                onEditLayout({ ...layout, fields: layout.fields.filter((f) => f.id !== field.id) });
                onSelectField("");
              }}
            >
              {t("sign.remove")}
            </Button>
          </fieldset>
        )}
        <Button variant="outline" onClick={downloadLayout}>
          {t("sign.saveLayout")}
        </Button>
        <label className="block">
          {t("sign.restore")}
          <input
            type="file"
            accept=".json"
            className="block w-full min-w-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) {
                void restoreLayout(file);
              }
            }}
          />
        </label>
      </fieldset>
    </Card>
  );
}

function PageCanvas({ pdf, index }: { pdf: PDFDocumentProxy; index: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    setError("");
    const render = async () => {
      const page = await pdf.getPage(index + 1);
      if (cancelled || !host.current) {
        return;
      }
      const unit = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 1400 / Math.max(unit.width, unit.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.className = "block w-full h-auto";
      canvas.setAttribute("aria-label", "PDF page " + (index + 1));
      const job = page.render({ canvas, viewport });
      stop = () => job.cancel();
      await job.promise;
      if (!cancelled) {
        host.current?.replaceChildren(canvas);
      }
    };
    void render().catch((reason: unknown) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : "This page could not be rendered.");
      }
    });
    const container = host.current;
    return () => {
      cancelled = true;
      stop();
      container?.replaceChildren();
    };
  }, [pdf, index]);
  return <div ref={host}>{error && <p role="alert">{error}</p>}</div>;
}

export function SignEditorPreview({
  pdf,
  page,
  zoom,
  onPageChange,
  onZoomChange,
  onPlaceField,
  children,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onPlaceField?: (x: number, y: number) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={!page} onClick={() => onPageChange(page - 1)}>
          {t("sign.previous")}
        </Button>
        {t("sign.page", { page: page + 1, count: pdf.numPages })}
        <Button
          variant="outline"
          disabled={page + 1 === pdf.numPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("sign.next")}
        </Button>
        <label>
          {t("sign.zoom")}{" "}
          <select
            className={control}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          >
            {[75, 100, 125, 150].map((z) => (
              <option key={z} value={z}>
                {z}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-auto border bg-muted p-2">
        <div
          style={{ width: zoom + "%" }}
          data-sign-page
          className="relative bg-white"
          onClick={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            if (bounds.height > 0) {
              onPlaceField?.(
                (e.clientX - bounds.left) / bounds.width,
                (e.clientY - bounds.top) / bounds.height
              );
            }
          }}
        >
          <PageCanvas pdf={pdf} index={page} />
          {children}
        </div>
      </div>
    </section>
  );
}
