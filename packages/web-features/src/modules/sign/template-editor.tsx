import { RequestComposer, type CreateRequest } from "./request-composer";
import { useTranslation } from "react-i18next";
import { FieldOverlay } from "./field-overlay";
import { useEffect, useState } from "react";
import { SignEditorControls, SignEditorPreview } from "./template-editor-panes";
import { Link, useLocation } from "react-router-dom";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  moveSignField,
  SignLayoutSchema,
  type SignDraft,
  type SignField,
  type SignLayout,
} from "@corely/contracts";
import { Button, Card, Input } from "@corely/ui";

GlobalWorkerOptions.workerSrc = workerUrl;

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
  const field = layout?.fields.find((f) => f.id === selected);
  useEffect(() => {
    if (!upload.file) {
      return;
    }
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
      if (input.size > 10 * 1024 * 1024) {
        throw new Error("Choose a PDF smaller than 10 MiB.");
      }
      if (upload.convert) {
        const { createStaticPdfCopy } = await import("./static-pdf-copy");
        input = await createStaticPdfCopy(input, controller.signal);
      }
      const bytes = await input.arrayBuffer();
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
        throw new Error("Choose a valid PDF file.");
      }
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");
      if (cancelled) {
        return;
      }
      const task = getDocument({
        data: bytes,
        useSystemFonts: false,
        stopAtErrors: true,
      });
      close = () => {
        void task.destroy();
      };
      const doc = await task.promise;
      if (cancelled) {
        return;
      }
      if (doc.numPages > 100) {
        throw new Error("Choose a PDF with at most 100 pages.");
      }
      if (
        initial &&
        (initial.layout.document.sha256 !== sha256 ||
          initial.layout.document.pageCount !== doc.numPages)
      ) {
        throw Error("Choose the PDF associated with this draft.");
      }
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
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Cannot open PDF.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
      close();
    };
  }, [upload, initial]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function storeDraft() {
    if (!saveDraft || !layout || !file || saving) {
      return;
    }
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
    if (!saveDraft || !publishDraft || !layout || !file || saving || !hasSignatures) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const draft = matchesStored && stored ? stored : await saveDraft(layout, draftTitle, file);
      setStored(draft);
      if (draft.revision !== published) {
        await publishDraft(draft.revision);
      }
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
    if (!layout) {
      return;
    }
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
    if (layout) {
      edit({ ...layout, fields: layout.fields.map((f) => (f.id === next.id ? next : f)) });
    }
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
      <fieldset disabled={saving} className="min-w-0 space-y-5">
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
        <label className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-5 text-sm font-medium shadow-sm">
          {t("sign.pdf")}
          <Input
            className="min-w-0 max-w-lg"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (!next) {
                return;
              }
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
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <SignEditorControls
              filename={file?.name}
              archived={initial?.archived}
              layout={layout}
              role={role}
              type={type}
              field={field}
              preview={preview}
              dirty={dirty}
              onRoleChange={setRole}
              onTypeChange={setType}
              onPreviewChange={(enabled) => {
                setPreview(enabled);
                select("");
              }}
              onAddField={() => addField()}
              onSelectField={select}
              onUpdateField={updateField}
              onEditLayout={edit}
              onSaveLayout={() => setDirty(false)}
              onRestoreLayout={(restored) => {
                setLayout(restored);
                setRole(restored.roles[0].id);
                select("");
                setDirty(false);
                setError("");
              }}
              onError={setError}
            >
              {saveDraft && (
                <div className="grid grid-cols-1 gap-2">
                  <label>
                    {t(requestMode ? "sign.documentTitle" : "sign.title")}
                    <input
                      className="w-full min-w-0 rounded-md border bg-background px-3 py-2"
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
                        className="h-auto min-h-11 whitespace-normal"
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
                        className="h-auto min-h-11 whitespace-normal"
                        disabled={!draftTitle.trim() || saving}
                        onClick={() => void storeDraft()}
                      >
                        {saving ? t("sign.saving") : t("sign.saveWorkspace")}
                      </Button>
                      {publishDraft && stored && (
                        <Button
                          className="h-auto min-h-11 whitespace-normal"
                          variant="outline"
                          disabled={
                            saving ||
                            stored.revision === published ||
                            draftTitle.trim() !== stored.title ||
                            JSON.stringify(layout) !== JSON.stringify(stored.layout)
                          }
                          onClick={async () => {
                            if (!window.confirm(t("sign.publishConfirm"))) {
                              return;
                            }
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
            </SignEditorControls>
            <SignEditorPreview
              pdf={pdf}
              page={page}
              zoom={zoom}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                select("");
              }}
              onZoomChange={setZoom}
              onPlaceField={saving || initial?.archived || preview ? undefined : addField}
            >
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
            </SignEditorPreview>
          </div>
        )}
      </fieldset>
    </section>
  );
}
