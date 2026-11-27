import {
  SignFieldTypeSchema,
  SignRequestDraftSchema,
  UpdateSignRequestDraftSchema,
  moveSignField,
  type SignField,
  type SignLayout,
  type SignRequestDraft,
} from "@corely/contracts";
import { Button, Input, LoadingSkeleton, Textarea } from "@corely/ui";
import { apiClient } from "@corely/web-shared/lib/api-client";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldOverlay } from "./field-overlay";
import { SignEditorPreview } from "./template-editor-panes";
import { SignerMark, signerColor } from "./signer-colors";
import { useRequestDocument } from "./use-request-document";

export type RequestEditStep = "recipientsTitle" | "placeFields" | "requestSettings";
type EditorProps = {
  draft: SignRequestDraft;
  workspace: string;
  onCancel: () => void;
  onSaved: (draft: SignRequestDraft) => void;
  startStep: RequestEditStep;
};

export default function RequestDraftEditor(props: EditorProps) {
  const { t } = useTranslation();
  const { ready, failed, retry } = useRequestDocument(props.draft, props.workspace);
  if (failed || (ready && !ready.source.layout)) {
    return (
      <section className="space-y-3">
        <h1 className="text-h1">{t("sign.editRequest")}</h1>
        <p role="alert" className="text-destructive">
          {t("sign.sourceError")}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="outline" onClick={retry}>
            {t("sign.retry")}
          </Button>
        </div>
      </section>
    );
  }
  if (!ready?.source.layout) {
    return <LoadingSkeleton label={t("sign.opening")} variant="detail" withHeading />;
  }
  return <DraftEditor {...props} pdf={ready.pdf} initialLayout={ready.source.layout} />;
}

function DraftEditor({
  draft,
  workspace,
  onCancel,
  onSaved,
  startStep,
  pdf,
  initialLayout,
}: EditorProps & {
  pdf: PDFDocumentProxy;
  initialLayout: SignLayout;
}) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState(() => ({
    ...initialLayout,
    roles: draft.configuration
      ? initialLayout.roles
      : draft.recipients.flatMap((person) =>
          initialLayout.roles.filter((role) => role.id === person.roleId)
        ),
  }));
  const [recipients, setRecipients] = useState(draft.recipients);
  const [routing, setRouting] = useState(draft.routing);
  const settings = draft.configuration?.settings;
  const [expiry, setExpiry] = useState(
    () =>
      settings?.expiresAt?.slice(0, 10) ??
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [consent, setConsent] = useState(settings?.consent ?? "");
  const [invitation, setInvitation] = useState(settings?.invitation ?? "");
  const [step, setStep] = useState(startStep);
  const [roleId, setRoleId] = useState(draft.recipients[0].roleId);
  const [fieldId, setFieldId] = useState("");
  const [type, setType] = useState<SignField["type"]>("signature");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const colorIndex = (id: string) => layout.roles.findIndex((role) => role.id === id);
  const signerName = (id: string) =>
    recipients.find((person) => person.roleId === id)?.name.trim() ||
    layout.roles.find((role) => role.id === id)?.name ||
    t("sign.signer");
  const selected = layout.fields.find((field) => field.id === fieldId);
  const pending = recipients.filter(
    (person) =>
      !layout.fields.some(
        (field) => field.roleId === person.roleId && field.type === "signature" && field.required
      )
  );

  function moveRecipient(index: number, delta: number) {
    setRecipients((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  function updateField(field: SignField) {
    setLayout((current) => ({
      ...current,
      fields: current.fields.map((item) => (item.id === field.id ? field : item)),
    }));
  }

  function addField(x = 0.1, y = 0.1) {
    if (layout.fields.length >= 250) {
      return;
    }
    const field: SignField = {
      id: crypto.randomUUID(),
      documentId: layout.document.id,
      roleId,
      pageIndex: page,
      type,
      required: true,
      rect: moveSignField({ x: 0, y: 0, width: 0.24, height: 0.06 }, x, y),
    };
    setLayout((current) => ({ ...current, fields: [...current.fields, field] }));
    setFieldId(field.id);
  }

  async function save() {
    if (busy) {
      return;
    }
    const result = UpdateSignRequestDraftSchema.safeParse({
      expectedRevision: draft.configuration?.revision ?? 0,
      routing,
      recipients,
      layout,
      settings: {
        expiresAt: expiry ? expiry + "T23:59:59.000Z" : null,
        consent,
        invitation,
      },
    });
    if (!result.success) {
      if (result.error.issues.some((issue) => issue.path[0] === "recipients")) {
        setStep("recipientsTitle");
        setError(t("sign.recipientError"));
      } else {
        setError(result.error.issues[0].message);
      }
      return;
    }
    setBusy(true);
    setError("");
    try {
      const value = await apiClient.request(
        "/sign/requests/" + draft.requestId,
        {
          method: "PUT",
          headers: { "X-Workspace-Id": workspace, "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        },
        { workspaceScope: "none" }
      );
      onSaved(SignRequestDraftSchema.parse(value));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("sign.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-6xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-h1">{t("sign.editRequest")}</h1>
        <p className="break-words text-sm text-muted-foreground">{draft.title}</p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label={t("sign.editRequest")}>
        {(["recipientsTitle", "placeFields", "requestSettings"] as const).map((key) => (
          <Button
            key={key}
            variant={step === key ? "secondary" : "outline"}
            aria-current={step === key ? "step" : undefined}
            disabled={busy}
            onClick={() => setStep(key)}
          >
            {t("sign." + key)}
          </Button>
        ))}
      </nav>
      <fieldset disabled={busy} className="min-w-0 space-y-4 rounded-lg border bg-card p-4">
        {step === "recipientsTitle" && (
          <>
            <label className="grid max-w-xs gap-1 text-sm font-medium">
              {t("sign.routing")}
              <select
                className="min-h-11 rounded-md border bg-background px-3"
                value={routing}
                onChange={(event) =>
                  setRouting(event.target.value === "sequential" ? "sequential" : "parallel")
                }
              >
                <option value="parallel">{t("sign.parallel")}</option>
                <option value="sequential">{t("sign.sequential")}</option>
              </select>
            </label>
            <ol className="divide-y">
              {recipients.map((person, index) => (
                <li key={person.roleId} className="space-y-2 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    <SignerMark index={colorIndex(person.roleId)} />
                    {routing === "sequential" && index + 1 + ". "}
                    {signerName(person.roleId)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium">
                      {t("sign.name")}
                      <Input
                        value={person.name}
                        maxLength={160}
                        onChange={(event) => {
                          const name = event.target.value;
                          setRecipients((current) =>
                            current.map((item) =>
                              item.roleId === person.roleId ? { ...item, name } : item
                            )
                          );
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                      {t("sign.email")}
                      <Input
                        type="email"
                        value={person.email}
                        maxLength={254}
                        onChange={(event) => {
                          const email = event.target.value;
                          setRecipients((current) =>
                            current.map((item) =>
                              item.roleId === person.roleId ? { ...item, email } : item
                            )
                          );
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {routing === "sequential" && (
                      <>
                        <Button
                          variant="outline"
                          disabled={index === 0}
                          onClick={() => moveRecipient(index, -1)}
                        >
                          {t("sign.earlier")}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={index === recipients.length - 1}
                          onClick={() => moveRecipient(index, 1)}
                        >
                          {t("sign.later")}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      disabled={recipients.length === 1}
                      onClick={() => {
                        const next = recipients.filter((item) => item.roleId !== person.roleId);
                        setRecipients(next);
                        setLayout((current) => ({
                          ...current,
                          roles: current.roles.filter((role) => role.id !== person.roleId),
                          fields: current.fields.filter((field) => field.roleId !== person.roleId),
                        }));
                        if (roleId === person.roleId) {
                          setRoleId(next[0].roleId);
                          setFieldId("");
                        }
                      }}
                    >
                      {t(
                        layout.fields.some((field) => field.roleId === person.roleId)
                          ? "sign.removeSignerAndFields"
                          : "sign.removeSigner"
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <Button
              variant="outline"
              disabled={recipients.length >= 20}
              onClick={() => {
                const id = crypto.randomUUID();
                setLayout((current) => ({
                  ...current,
                  roles: [
                    ...current.roles,
                    { id, name: t("sign.signer") + " " + (recipients.length + 1) },
                  ],
                }));
                setRecipients((current) => [...current, { roleId: id, name: "", email: "" }]);
                setRoleId(id);
                setFieldId("");
              }}
            >
              {t("sign.addSigner")}
            </Button>
          </>
        )}
        {step === "placeFields" && (
          <>
            <p className="text-sm text-muted-foreground">{t("sign.placeFieldInstructions")}</p>
            {pending.length > 0 && (
              <p className="text-sm" role="status">
                {t("sign.missingSignatures", {
                  names: pending.map((person) => signerName(person.roleId)).join(", "),
                })}
              </p>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-0 max-w-full gap-1 text-sm font-medium">
                {t("sign.signer")}
                <select
                  className="min-h-11 max-w-full rounded-md border bg-background px-3"
                  value={roleId}
                  onChange={(event) => {
                    setRoleId(event.target.value);
                    setFieldId("");
                  }}
                >
                  {recipients.map((person) => (
                    <option key={person.roleId} value={person.roleId}>
                      {signerName(person.roleId)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {t("sign.fieldType")}
                <select
                  className="min-h-11 rounded-md border bg-background px-3"
                  value={type}
                  onChange={(event) => setType(SignFieldTypeSchema.parse(event.target.value))}
                >
                  {SignFieldTypeSchema.options.map((value) => (
                    <option key={value} value={value}>
                      {t("sign." + value)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                disabled={layout.fields.length >= 250}
                onClick={() => addField()}
              >
                {t("sign.addField")}
              </Button>
            </div>
            {selected && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <SignerMark index={colorIndex(selected.roleId)} />
                  <span className="min-w-0 break-words">
                    {signerName(selected.roleId)} · {t("sign." + selected.type)}
                  </span>
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(event) =>
                      updateField({ ...selected, required: event.target.checked })
                    }
                  />
                  {t("sign.required")}
                </label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLayout((current) => ({
                      ...current,
                      fields: current.fields.filter((field) => field.id !== selected.id),
                    }));
                    setFieldId("");
                  }}
                >
                  {t("sign.remove")}
                </Button>
              </div>
            )}
            <SignEditorPreview
              pdf={pdf}
              page={page}
              zoom={zoom}
              onPageChange={(next) => {
                setPage(next);
                setFieldId("");
              }}
              onZoomChange={setZoom}
              onPlaceField={addField}
            >
              {layout.fields
                .filter((field) => field.pageIndex === page)
                .map((field) => (
                  <FieldOverlay
                    key={field.id}
                    field={field}
                    roleName={signerName(field.roleId)}
                    color={signerColor(colorIndex(field.roleId))}
                    selected={field.id === fieldId}
                    preview={false}
                    onSelect={() => {
                      setFieldId(field.id);
                      setRoleId(field.roleId);
                    }}
                    onChange={(rect) => updateField({ ...field, rect })}
                  />
                ))}
            </SignEditorPreview>
          </>
        )}
        {step === "requestSettings" && (
          <div className="grid max-w-2xl gap-4">
            <label className="grid w-fit gap-1 text-sm font-medium">
              {t("sign.expiry")}
              <Input
                type="date"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              {t("sign.invitation")}
              <Textarea
                value={invitation}
                maxLength={2000}
                onChange={(event) => setInvitation(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              {t("sign.consentLabel")}
              <Textarea
                value={consent}
                maxLength={2000}
                onChange={(event) => setConsent(event.target.value)}
              />
            </label>
          </div>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t bg-background py-3">
        <Button variant="accent" disabled={busy} onClick={() => void save()}>
          {t(busy ? "sign.saving" : "sign.saveRequestDraft")}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          {t("sign.discardRequestEdits")}
        </Button>
      </div>
    </section>
  );
}
