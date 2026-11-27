"use client";
import { useEffect, useRef, useState } from "react";
import type { SignRecipientMessages } from "@corely/web-shared/shared/i18n/sign-recipient";
import { DocumentPreview, type SigningPdfAssets } from "./document-preview";
import { SignatureInput } from "./signature-input";
import { SignRecipientReviewSchema, type DrawnSignature } from "@corely/contracts";
type Review = ReturnType<typeof SignRecipientReviewSchema.parse>;
export function RecipientForm({
  lang,
  messages,
  pdfAssets,
}: {
  lang: string;
  messages: SignRecipientMessages;
  pdfAssets: SigningPdfAssets;
}) {
  async function post(action: string, body: unknown) {
    const r = await fetch("/api/signing/" + action, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Sign-Action": "1" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      throw Error(r.status === 403 ? messages.linkUnavailable : messages.requestFailed);
    }
    return r;
  }
  const [progressSaved, setProgressSaved] = useState(false);
  const [prepared, setPrepared] = useState<{ confirmation: string; pdf: string }>();
  const token = useRef("");
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const [review, setReview] = useState<Review>(),
    [pdf, setPdf] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<"signatureRecorded" | "requestDeclined">(),
    [consent, setConsent] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean | DrawnSignature>>({});
  useEffect(() => {
    if (/^#[A-Za-z0-9_-]{43}$/.test(location.hash)) {
      token.current = location.hash.slice(1);
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  useEffect(() => {
    if (confirm) {
      confirmationHeading.current?.focus();
    }
  }, [confirm]);
  const displayedPdf = confirm && prepared ? prepared.pdf : review?.pdf;
  useEffect(() => {
    if (!displayedPdf) {
      return;
    }
    const bytes = Uint8Array.from(atob(displayedPdf), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPdf(url);
    return () => URL.revokeObjectURL(url);
  }, [displayedPdf]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : messages.unableToSign);
    } finally {
      setBusy(false);
    }
  }
  async function open() {
    if (token.current) {
      await post("exchange", { token: token.current });
      token.current = "";
    }
    const opened = SignRecipientReviewSchema.parse(await (await post("review", {})).json());
    setValues(Object.fromEntries(opened.saved.map((v) => [v.fieldId, v.value])));
    setReview(opened);
  }
  async function finish(action: "accept" | "decline") {
    await post(
      action,
      action === "accept"
        ? {
            confirmation: prepared?.confirmation,
            review: review?.review,
            consent,
            values: Object.entries(values)
              .filter(([, value]) => value !== "")
              .map(([fieldId, value]) => ({ fieldId, value })),
          }
        : {}
    );
    setProgressSaved(false);
    setReview(undefined);
    setValues({});
    setConfirm(false);
    setPrepared(undefined);
    setPdf("");
    setResult(action === "accept" ? "signatureRecorded" : "requestDeclined");
  }
  return (
    <main lang={lang} className="mx-auto max-w-3xl space-y-5 p-5">
      <h1 className="text-3xl font-semibold">{review?.title ?? messages.reviewAndSign}</h1>
      {progressSaved && <p role="status">{messages.progressSaved}</p>}
      {review?.senderWorkspace && (
        <p>
          {messages.requestedBy} {review.senderWorkspace}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {result ? (
        <p role="status">{messages[result]}</p>
      ) : !review ? (
        <button disabled={busy} onClick={() => void run(open)}>
          {messages.openForReview}
        </button>
      ) : (
        <>
          {pdf && (
            <>
              <a href={pdf} target="_blank" rel="noreferrer" className="underline">
                {confirm ? messages.openReviewedPdf : messages.openOriginalPdf}
              </a>
              <DocumentPreview
                assets={pdfAssets}
                messages={messages}
                key={confirm ? "reviewed" : "original"}
                source={confirm && prepared ? prepared.pdf : review.pdf}
                fields={confirm ? [] : review.fields}
              />
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!confirm) {
                void run(async () => {
                  const response = await post("prepare", {
                    review: review?.review,
                    consent,
                    values: Object.entries(values)
                      .filter(([, v]) => v !== "")
                      .map(([fieldId, value]) => ({ fieldId, value })),
                  });
                  setPrepared((await response.json()) as { confirmation: string; pdf: string });
                  setConfirm(true);
                });
                return;
              }
              void run(() => finish("accept"));
            }}
            className="grid gap-4"
          >
            <fieldset disabled={busy || confirm} className="grid gap-3">
              {review.fields.map((f, i) => (
                <fieldset id={"field-" + f.id} key={f.id} className="grid gap-1" tabIndex={-1}>
                  <legend>
                    {f.type === "signature" ? messages.typeSignature : messages[f.type]} ·{" "}
                    {messages.page} {f.pageIndex + 1} · {messages.field} {i + 1}
                  </legend>
                  {f.type === "signature" || f.type === "initials" ? (
                    <SignatureInput
                      messages={messages}
                      label={messages[f.type]}
                      required={f.required}
                      value={
                        typeof values[f.id] === "boolean"
                          ? ""
                          : ((values[f.id] as string | DrawnSignature) ?? "")
                      }
                      onChange={(v) => setValues({ ...values, [f.id]: v })}
                    />
                  ) : (
                    <input
                      aria-label={messages[f.type]}
                      className="rounded border p-2"
                      checked={f.type === "checkbox" ? Boolean(values[f.id]) : undefined}
                      value={f.type === "checkbox" ? undefined : String(values[f.id] ?? "")}
                      type={
                        f.type === "checkbox" ? "checkbox" : f.type === "date" ? "date" : "text"
                      }
                      maxLength={240}
                      required={f.required}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          [f.id]: f.type === "checkbox" ? e.target.checked : e.target.value,
                        })
                      }
                    />
                  )}
                </fieldset>
              ))}
              <label>
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                {review.consent}
              </label>
            </fieldset>
            {confirm && (
              <>
                <h2 ref={confirmationHeading} tabIndex={-1}>
                  {messages.confirmSignature}
                </h2>
                <ul>
                  {review.fields.map((f) => (
                    <li key={f.id}>
                      {messages[f.type]} ·{" "}
                      {typeof values[f.id] === "object"
                        ? messages.drawnSignature
                        : String(values[f.id] ?? "—")}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setConfirm(false)}>
                  {messages.editAnswers}
                </button>
              </>
            )}
            {!confirm && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await post(
                      "progress",
                      Object.entries(values)
                        .filter(([, v]) => v !== "")
                        .map(([fieldId, value]) => ({ fieldId, value }))
                    );
                    setProgressSaved(true);
                  })
                }
              >
                {messages.saveProgress}
              </button>
            )}
            <button
              disabled={busy}
              className="rounded bg-primary px-4 py-2 text-primary-foreground"
            >
              {confirm ? messages.signAndSubmit : messages.reviewAnswers}
            </button>
          </form>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(messages.confirmDecline)) {
                void run(() => finish("decline"));
              }
            }}
          >
            {messages.declineRequest}
          </button>
        </>
      )}
      <footer></footer>
    </main>
  );
}
