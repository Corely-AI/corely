import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input } from "@corely/ui";
import { useNavigate } from "react-router-dom";
import {
  CreateSignRequestDraftSchema,
  type CreateSignRequestDraft,
  type SignRequestDraft,
  type SignDraft,
} from "@corely/contracts";

export type CreateRequest = (
  input: CreateSignRequestDraft,
  key: string
) => Promise<SignRequestDraft>;
export function RequestComposer({
  template,
  create,
  onEditFields,
}: {
  template: SignDraft;
  create: CreateRequest;
  onEditFields?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState(() =>
    template.layout.roles.map((role) => ({ roleId: role.id, name: "", email: "" }))
  );
  const [routing, setRouting] = useState<CreateSignRequestDraft["routing"]>("parallel");
  const [saved, setSaved] = useState<SignRequestDraft>();
  const [open, setOpen] = useState(Boolean(onEditFields)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<{ payload: string; key: string }>();
  async function submit() {
    const parsed = CreateSignRequestDraftSchema.safeParse({
      templateId: template.templateId,
      templateRevision: template.revision,
      routing,
      recipients,
    });
    if (!parsed.success) {
      setError(t("sign.recipientError"));
      return;
    }
    const payload = JSON.stringify(parsed.data);
    if (pending.current?.payload !== payload)
      pending.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const result = await create(parsed.data, pending.current.key);
      setSaved(result);
      if (onEditFields) navigate("/sign/requests/" + result.requestId, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("sign.saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <div role="status">
        <p>{t("sign.requestSaved")}</p>
        <a className="underline" href={"/sign/requests/" + saved.requestId}>
          {t("sign.openRequest")}
        </a>
      </div>
    );
  if (!open) return <Button onClick={() => setOpen(true)}>{t("sign.prepareRequest")}</Button>;
  return (
    <fieldset disabled={busy} className="grid gap-3">
      <legend className="font-semibold">{t("sign.prepareRequest")}</legend>
      <label>
        {t("sign.routing")}{" "}
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={routing}
          onChange={(e) => setRouting(e.target.value === "sequential" ? "sequential" : "parallel")}
        >
          <option value="parallel">{t("sign.parallel")}</option>
          <option value="sequential">{t("sign.sequential")}</option>
        </select>
      </label>
      {recipients.map((recipient, index) => (
        <fieldset key={recipient.roleId} className="grid gap-2 rounded border p-2">
          <legend>
            {index + 1}. {template.layout.roles.find((r) => r.id === recipient.roleId)?.name}
          </legend>
          {(["name", "email"] as const).map((key) => (
            <label className="grid gap-1 text-sm font-medium" key={key}>
              {t("sign." + key)}
              <Input
                type={key === "email" ? "email" : "text"}
                value={recipient[key]}
                maxLength={key === "email" ? 254 : 160}
                onChange={(e) =>
                  setRecipients((current) =>
                    current.map((r) =>
                      r.roleId === recipient.roleId ? { ...r, [key]: e.target.value } : r
                    )
                  )
                }
              />
            </label>
          ))}
          {routing === "sequential" && index > 0 && (
            <Button
              variant="outline"
              onClick={() =>
                setRecipients((current) => {
                  const next = [...current];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  return next;
                })
              }
            >
              {t("sign.earlier")}
            </Button>
          )}
        </fieldset>
      ))}
      {error && <p role="alert">{error}</p>}
      {onEditFields && (
        <Button variant="outline" onClick={onEditFields}>
          {t("sign.editFields")}
        </Button>
      )}
      <Button onClick={() => void submit()}>
        {t(onEditFields ? "sign.continueReview" : "sign.createRequestDraft")}
      </Button>
    </fieldset>
  );
}
