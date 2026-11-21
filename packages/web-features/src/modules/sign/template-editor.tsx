import { RequestComposer, type CreateRequest } from "./request-composer";
import { useTranslation } from "react-i18next";
import { FieldOverlay } from "./field-overlay";
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  moveSignField,
  SignFieldTypeSchema,
  SignLayoutSchema,
  type SignDraft,
  type SignField,
  type SignLayout,
} from "@corely/contracts";
import { Button, Card, Input } from "@corely/ui";

GlobalWorkerOptions.workerSrc = workerUrl;
const control = "rounded-md border bg-background px-3 py-2";

function PageCanvas({ pdf, index }: { pdf: PDFDocumentProxy; index: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    setError("");
    const render = async () => {
      const page = await pdf.getPage(index + 1);
      if (cancelled || !host.current) return;
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
      if (!cancelled) host.current?.replaceChildren(canvas);
    };
    void render().catch((reason: unknown) => {
      if (!cancelled)
        setError(reason instanceof Error ? reason.message : "This page could not be rendered.");
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

export default function TemplateEditor({
  initial,
  sourceFile,
  saveDraft,
  publishDraft,
  createRequest,
  requestMode = false,
}: {
  initial?: SignDraft;
  requestMode?: boolean;
  createRequest?: CreateRequest;
  sourceFile?: File;
  publishDraft?: (revision: number) => Promise<void>;
  saveDraft?: (layout: SignLayout, title: string, file: File) => Promise<SignDraft>;
} = {}) {
  const [published, setPublished] = useState<number>();
  const { t } = useTranslation();
  const { search } = useLocation();
  const [recipientStep, setRecipientStep] = useState(false);
  const [upload, setUpload] = useState({ file: sourceFile, convert: false });
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState<SignDraft | undefined>(initial);
  const [draftTitle, setDraftTitle] = useState(initial?.title ?? "");

  const [file, setFile] = useState<File | undefined>(sourceFile);
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [layout, setLayout] = useState<SignLayout>();
  const [page, setPage] = useState(0);
  const [role, setRole] = useState("signer");
  const [type, setType] = useState<SignField["type"]>("signature");
  const [selected, select] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const label = (name: string) => t("sign." + name);
  const field = layout?.fields.find((f) => f.id === selected);
  useEffect(() => {
    if (!upload.file) return;
    const controller = new AbortController();
    let cancelled = false;
    let close = () => {};
    setPdf(undefined);
    setLayout(undefined);
    setPage(0);
    setRole("signer");
    select("");
    setError("");
    setDirty(false);
    setLoading(true);
    async function open(input: File) {
      if (input.size > 10 * 1024 * 1024) throw new Error("Choose a PDF smaller than 10 MiB.");
      if (upload.convert) {
        const { createStaticPdfCopy } = await import("./static-pdf-copy");
        input = await createStaticPdfCopy(input, controller.signal);
      }
      const bytes = await input.arrayBuffer();
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
        throw new Error("Choose a valid PDF file.");
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");
      if (cancelled) return;
      const task = getDocument({
        data: bytes,
        useSystemFonts: false,
        stopAtErrors: true,
      });
      close = () => {
        void task.destroy();
      };
      const doc = await task.promise;
      if (cancelled) return;
      if (doc.numPages > 100) throw new Error("Choose a PDF with at most 100 pages.");
      if (
        initial &&
        (initial.layout.document.sha256 !== sha256 ||
          initial.layout.document.pageCount !== doc.numPages)
      )
        throw Error("Choose the PDF associated with this draft.");
      setPdf(doc);
      setFile(input);
      if (initial) {
        setLayout(initial.layout);
        setRole(initial.layout.roles[0].id);
        return;
      }
      setDraftTitle(input.name.replace(/\.pdf$/i, "").slice(0, 160));
      setLayout({
        schemaVersion: 1,
        document: { id: "original", sha256, pageCount: doc.numPages },
        roles: [{ id: "signer", name: t("sign.signer") }],
        fields: [],
      });
    }
    void open(upload.file)
      .catch((e) => {
        close();
        if (!cancelled) setError(e instanceof Error ? e.message : "Cannot open PDF.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
      close();
    };
  }, [upload, initial]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function storeDraft() {
    if (!saveDraft || !layout || !file || saving) return;
    setSaving(true);
    setError("");
    try {
      const draft = await saveDraft(layout, draftTitle, file);
      setStored(draft);
      setDirty(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save draft.");
    } finally {
      setSaving(false);
    }
  }
  const matchesStored =
    !!stored &&
    draftTitle.trim() === stored.title &&
    JSON.stringify(layout) === JSON.stringify(stored.layout);
  const hasSignatures = layout?.roles.every((signer) =>
    layout.fields.some((f) => f.roleId === signer.id && f.type === "signature" && f.required)
  );
  async function prepareRecipients() {
    if (!saveDraft || !publishDraft || !layout || !file || saving || !hasSignatures) return;
    setSaving(true);
    setError("");
    try {
      const draft = matchesStored && stored ? stored : await saveDraft(layout, draftTitle, file);
      setStored(draft);
      if (draft.revision !== published) await publishDraft(draft.revision);
      setPublished(draft.revision);
      setDirty(false);
      setRecipientStep(true);
    } catch (reason) {
      const detail =
        reason && typeof reason === "object" && "body" in reason ? reason.body : undefined;
      setError(
        detail &&
          typeof detail === "object" &&
          "detail" in detail &&
          typeof detail.detail === "string"
          ? detail.detail
          : reason instanceof Error
            ? reason.message
            : t("sign.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  }
  function edit(next: SignLayout) {
    const parsed = SignLayoutSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLayout(parsed.data);
    setError("");
    setDirty(true);
  }
  function addField(x = 0.1, y = 0.1) {
    if (!layout) return;
    const id = crypto.randomUUID();
    edit({
      ...layout,
      fields: [
        ...layout.fields,
        {
          id,
          documentId: layout.document.id,
          roleId: role,
          pageIndex: page,
          type,
          required: true,
          rect: moveSignField({ x: 0, y: 0, width: 0.24, height: 0.06 }, x, y),
        },
      ],
    });
    select(id);
  }
  function updateField(next: SignField) {
    if (layout)
      edit({ ...layout, fields: layout.fields.map((f) => (f.id === next.id ? next : f)) });
  }
  function save() {
    if (!layout) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sign-layout.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDirty(false);
  }

  if (requestMode && recipientStep && stored && createRequest) {
    return (
      <section className="max-w-3xl space-y-5 p-4 sm:p-6 lg:p-8">
        <h1 className="text-h1 text-foreground">{t("sign.recipients")}</h1>
        <p className="break-words">{stored.title}</p>
        <Card className="p-5">
          <RequestComposer
            template={stored}
            create={createRequest}
            onEditFields={() => setRecipientStep(false)}
          />
        </Card>

      </section>
    );
  }
  return (
    <section className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">
      <h1 className="text-h1 text-foreground">
        {t(requestMode ? "sign.prepareRequest" : "sign.prepare")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t(requestMode ? "sign.uploadInstructions" : "sign.instructions")}
      </p>
      {requestMode && (
        <Button variant="outline" asChild>
          <Link to={"/sign/templates" + search}>{t("sign.useTemplate")}</Link>
        </Button>
      )}
      {initial && !sourceFile && (
        <p>
          Open the original PDF to edit {initial.title} (revision {initial.revision}).
        </p>
      )}
      {initial?.archived && (
        <p role="status">
          {t("sign.archived")} · {t("sign.revision", { revision: initial.revision })}
        </p>
      )}
      <fieldset disabled={saving} className="space-y-5">
        {requestMode && (
          <label className="flex items-start gap-2 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={upload.convert}
              onChange={(e) => {
                if (!dirty || window.confirm(t("sign.discard"))) {
                  setUpload({ file: upload.file, convert: e.target.checked });
                }
              }}
            />
            {t("sign.staticCopy")}
          </label>
        )}
        <label className="grid gap-3 rounded-lg border bg-card p-5 text-sm font-medium shadow-sm">
          {t("sign.pdf")}
          <Input
            className="max-w-lg"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (!next) return;
              if (!dirty || window.confirm(t("sign.discard"))) {
                setUpload({ file: next, convert: upload.convert });
              } else {
                e.target.value = "";
              }
            }}
          />
        </label>
        {loading && <p role="status">{t("sign.opening")}</p>}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {pdf && layout && (
          <div className="grid items-start gap-5 lg:grid-cols-[18rem_1fr]">
            <Card className="p-4">
              <fieldset disabled={initial?.archived} className="space-y-4">
                <p className="break-words font-semibold">{file?.name}</p>
                {saveDraft && (
                  <div className="grid gap-2">
                    <label>
                      {t(requestMode ? "sign.documentTitle" : "sign.title")}
                      <input
                        className={control + " w-full"}
                        maxLength={160}
                        value={draftTitle}
                        onChange={(e) => {
                          setDraftTitle(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                    {requestMode ? (
                      <>
                        {!hasSignatures && (
                          <p className="text-sm text-muted-foreground">
                            {t("sign.requireSignatures")}
                          </p>
                        )}
                        <Button
                          variant="accent"
                          disabled={saving || !draftTitle.trim() || !hasSignatures}
                          onClick={() => void prepareRecipients()}
                        >
                          {t(saving ? "sign.saving" : "sign.continueRecipients")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          disabled={!draftTitle.trim() || saving}
                          onClick={() => void storeDraft()}
                        >
                          {saving ? t("sign.saving") : t("sign.saveWorkspace")}
                        </Button>
                        {publishDraft && stored && (
                          <Button
                            variant="outline"
                            disabled={
                              saving ||
                              stored.revision === published ||
                              draftTitle.trim() !== stored.title ||
                              JSON.stringify(layout) !== JSON.stringify(stored.layout)
                            }
                            onClick={async () => {
                              if (!window.confirm(t("sign.publishConfirm"))) return;
                              setSaving(true);
                              setError("");
                              try {
                                await publishDraft(stored.revision);
                                setPublished(stored.revision);
                              } catch (reason) {
                                setError(
                                  reason instanceof Error
                                    ? reason.message
                                    : "Could not publish template."
                                );
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            {published === stored.revision
                              ? t("sign.published", { revision: published })
                              : t("sign.publish")}
                          </Button>
                        )}
                        {stored &&
                          matchesStored &&
                          createRequest &&
                          published === stored.revision && (
                            <RequestComposer
                              key={stored.revision}
                              template={stored}
                              create={createRequest}
                            />
                          )}
                        {stored && (
                          <a
                            className="underline"
                            href={
                              "/sign/templates/" +
                              stored.templateId +
                              "/edit" +
                              (new URLSearchParams(location.search).has("coaching")
                                ? "?coaching=" +
                                  encodeURIComponent(
                                    new URLSearchParams(location.search).get("coaching") ?? ""
                                  )
                                : "")
                            }
                          >
                            {t("sign.openSaved", { revision: stored.revision })}
                          </a>
                        )}
                      </>
                    )}
                  </div>
                )}
                <label className="grid gap-1">
                  {t("sign.signerRole")}
                  <select
                    className={control}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
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
                    edit({
                      ...layout,
                      roles: [
                        ...layout.roles,
                        { id, name: t("sign.signer") + " " + (layout.roles.length + 1) },
                      ],
                    });
                    if (layout.roles.length < 20) setRole(id);
                  }}
                >
                  {t("sign.addRole")}
                </Button>
                <label className="grid gap-1">
                  {t("sign.fieldType")}
                  <select
                    className={control}
                    value={type}
                    onChange={(e) => setType(SignFieldTypeSchema.parse(e.target.value))}
                  >
                    {SignFieldTypeSchema.options.map((t) => (
                      <option key={t} value={t}>
                        {label(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={preview || layout.fields.length >= 250}
                  onClick={() => addField()}
                >
                  {t("sign.addField")}
                </Button>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={preview}
                    onChange={(e) => {
                      setPreview(e.target.checked);
                      select("");
                    }}
                  />{" "}
                  Preview selected role
                </label>
                {field && (
                  <fieldset className="grid grid-cols-2 gap-2">
                    <legend className="mb-2 font-semibold">
                      {t("sign.placement", { type: label(field.type) })}
                    </legend>
                    <label className="col-span-2 grid gap-1">
                      {t("sign.selectedFieldType")}
                      <select
                        className={control}
                        value={field.type}
                        onChange={(e) =>
                          updateField({ ...field, type: SignFieldTypeSchema.parse(e.target.value) })
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
                            updateField({
                              ...field,
                              rect: { ...field.rect, [key]: e.target.valueAsNumber / 100 },
                            })
                          }
                        />
                      </label>
                    ))}
                    <label className="col-span-2">
                      {t("sign.assigned")}{" "}
                      <select
                        className={control}
                        value={field.roleId}
                        onChange={(e) => updateField({ ...field, roleId: e.target.value })}
                      >
                        {layout.roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      variant="outline"
                      disabled={layout.fields.length >= 250}
                      onClick={() => {
                        const copy = {
                          ...field,
                          id: crypto.randomUUID(),
                          rect: moveSignField(field.rect, 0.02, 0.02),
                        };
                        edit({ ...layout, fields: [...layout.fields, copy] });
                        select(copy.id);
                      }}
                    >
                      {t("sign.duplicate")}
                    </Button>
                    <label>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField({ ...field, required: e.target.checked })}
                      />{" "}
                      Required
                    </label>
                    <Button
                      variant="outline"
                      onClick={() => {
                        edit({ ...layout, fields: layout.fields.filter((f) => f.id !== selected) });
                        select("");
                      }}
                    >
                      {t("sign.remove")}
                    </Button>
                  </fieldset>
                )}
                <Button variant="outline" onClick={save}>
                  {t("sign.saveLayout")}
                </Button>
                <label className="block">
                  {t("sign.restore")}
                  <input
                    type="file"
                    accept=".json"
                    className="w-full"
                    onChange={async (e) => {
                      const input = e.target.files?.[0];
                      e.target.value = "";
                      if (!input || (dirty && !window.confirm(t("sign.replace")))) return;
                      try {
                        if (input.size > 512000) throw Error();
                        const restored = SignLayoutSchema.parse(JSON.parse(await input.text()));
                        if (
                          restored.document.sha256 !== layout.document.sha256 ||
                          restored.document.pageCount !== pdf.numPages
                        )
                          throw Error();
                        setLayout(restored);
                        setRole(restored.roles[0].id);
                        select("");
                        setDirty(false);
                        setError("");
                      } catch {
                        setError("Choose a valid layout saved for this PDF.");
                      }
                    }}
                  />
                </label>
              </fieldset>
            </Card>
            <section className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  disabled={!page}
                  onClick={() => {
                    setPage(page - 1);
                    select("");
                  }}
                >
                  {t("sign.previous")}
                </Button>{" "}
                {t("sign.page", { page: page + 1, count: pdf.numPages })}
                <Button
                  variant="outline"
                  disabled={page + 1 === pdf.numPages}
                  onClick={() => {
                    setPage(page + 1);
                    select("");
                  }}
                >
                  {t("sign.next")}
                </Button>
                <label>
                  {t("sign.zoom")}{" "}
                  <select
                    className={control}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
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
                    const b = e.currentTarget.getBoundingClientRect();
                    if (!saving && !initial?.archived && !preview && b.height > 0)
                      addField((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
                  }}
                >
                  <PageCanvas pdf={pdf} index={page} />
                  {layout.fields
                    .filter((f) => f.pageIndex === page && (!preview || f.roleId === role))
                    .map((f) => (
                      <FieldOverlay
                        key={f.id}
                        field={f}
                        roleName={layout.roles.find((r) => r.id === f.roleId)?.name ?? ""}
                        selected={selected === f.id}
                        preview={preview || !!initial?.archived}
                        onSelect={() => select(f.id)}
                        onChange={(rect) => updateField({ ...f, rect })}
                      />
                    ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </fieldset>

    </section>
  );
}
