"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SignRecipientMessages } from "@corely/web-shared/shared/i18n/sign-recipient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  LoadingSkeleton,
  Skeleton,
} from "@corely/ui";
import { SignRecipientReviewSchema, type DrawnSignature } from "@corely/contracts";
import { DocumentPreview, type SigningPdfAssets } from "./document-preview";
import { SignatureInput } from "./signature-input";

type Review = ReturnType<typeof SignRecipientReviewSchema.parse>;
type Pending = "open" | "prepare" | "save" | "accept" | "decline";
type Answer = string | boolean | DrawnSignature;

class SigningResponseError extends Error {}

export function RecipientForm({
  lang,
  messages,
  pdfAssets,
}: {
  lang: string;
  messages: SignRecipientMessages;
  pdfAssets: SigningPdfAssets;
}) {
  const token = useRef("");
  const running = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const fieldsHeading = useRef<HTMLHeadingElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const returnToFields = useRef(false);
  const [review, setReview] = useState<Review>();
  const [pdfLink, setPdfLink] = useState<{ source: string; url: string }>();
  const [prepared, setPrepared] = useState<{ confirmation: string; pdf: string }>();
  const [values, setValues] = useState<Record<string, Answer>>({});
  const [pending, setPending] = useState<Pending>();
  const [error, setError] = useState("");
  const [progressSaved, setProgressSaved] = useState(false);
  const [result, setResult] = useState<"signatureRecorded" | "requestDeclined">();
  const [consent, setConsent] = useState(false);
  const confirm = Boolean(prepared);
  const busy = Boolean(pending);
  const displayedPdf = prepared?.pdf ?? review?.pdf;
  const pdf = pdfLink?.source === displayedPdf ? pdfLink?.url : undefined;

  useEffect(() => {
    if (/^#[A-Za-z0-9_-]{43}$/.test(location.hash)) {
      token.current = location.hash.slice(1);
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  useEffect(() => {
    if (confirm) {
      confirmationHeading.current?.focus();
    } else if (returnToFields.current) {
      returnToFields.current = false;
      fieldsHeading.current?.focus();
    } else if (review || result) {
      title.current?.focus();
    }
  }, [confirm, review, result]);
  useEffect(() => {
    if (!displayedPdf) {
      return;
    }
    try {
      const bytes = Uint8Array.from(atob(displayedPdf), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setPdfLink({ source: displayedPdf, url });
      return () => URL.revokeObjectURL(url);
    } catch {
      // The viewer reports a malformed document and offers retry.
    }
  }, [displayedPdf]);

  async function post(action: string, body: unknown) {
    const response = await fetch("/api/signing/" + action, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Sign-Action": "1" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new SigningResponseError(
        response.status === 403 ? messages.linkUnavailable : messages.requestFailed
      );
    }
    return response;
  }
  async function run(action: Pending, fn: () => Promise<void>) {
    if (running.current) {
      return;
    }
    running.current = true;
    setPending(action);
    setError("");
    try {
      await fn();
    } catch (reason) {
      setError(reason instanceof SigningResponseError ? reason.message : messages.requestFailed);
    } finally {
      running.current = false;
      setPending(undefined);
    }
  }
  async function open() {
    if (token.current) {
      await post("exchange", { token: token.current });
      token.current = "";
    }
    const opened = SignRecipientReviewSchema.parse(await (await post("review", {})).json());
    setValues(Object.fromEntries(opened.saved.map((value) => [value.fieldId, value.value])));
    setReview(opened);
  }
  function answers() {
    return Object.entries(values)
      .filter(([, value]) => value !== "")
      .map(([fieldId, value]) => ({ fieldId, value }));
  }
  function updateAnswer(id: string, value: Answer) {
    setValues((current) => ({ ...current, [id]: value }));
    setProgressSaved(false);
  }
  async function finish(action: "accept" | "decline") {
    await post(
      action,
      action === "accept"
        ? {
            confirmation: prepared?.confirmation,
            review: review?.review,
            consent,
            values: answers(),
          }
        : {}
    );
    setProgressSaved(false);
    setReview(undefined);
    setValues({});
    setPrepared(undefined);
    setPdfLink(undefined);
    setResult(action === "accept" ? "signatureRecorded" : "requestDeclined");
  }
  function reviewAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) {
      return;
    }
    if (prepared) {
      void run("accept", () => finish("accept"));
      return;
    }
    const missing = review.fields.find((field) => {
      const value = values[field.id];
      return field.required && (typeof value === "string" ? !value.trim() : !value);
    });
    if (missing || !consent) {
      setError(messages.completeRequiredFields);
      if (missing) {
        document.getElementById("field-" + missing.id)?.focus();
      }
      return;
    }
    void run("prepare", async () => {
      const response = await post("prepare", { review: review.review, consent, values: answers() });
      const preview: unknown = await response.json();
      if (
        !preview ||
        typeof preview !== "object" ||
        !("confirmation" in preview) ||
        typeof preview.confirmation !== "string" ||
        !/^[a-f0-9]{64}$/.test(preview.confirmation) ||
        !("pdf" in preview) ||
        typeof preview.pdf !== "string" ||
        !preview.pdf
      ) {
        throw new Error("Invalid signing preview");
      }
      setPrepared({ confirmation: preview.confirmation, pdf: preview.pdf });
    });
  }

  const errorMessage = error && (
    <p
      role="alert"
      className="rounded-lg border border-destructive/60 bg-card p-3 text-sm text-foreground"
    >
      {error}
    </p>
  );

  return (
    <main lang={lang} className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">Corely Sign</p>
        {result ? (
          <div role="status" className="max-w-xl space-y-2 rounded-xl border bg-card p-5 sm:p-6">
            <h1 ref={title} tabIndex={-1} className="text-2xl font-semibold tracking-tight">
              {messages[result]}
            </h1>
            <p className="text-sm text-muted-foreground">{messages.closePage}</p>
          </div>
        ) : (
          <>
            <h1
              ref={title}
              tabIndex={-1}
              className="break-words text-3xl font-semibold tracking-tight"
            >
              {review?.title ?? messages.reviewAndSign}
            </h1>
            {review?.senderWorkspace && (
              <p className="break-words text-sm text-muted-foreground">
                {messages.requestedBy}{" "}
                <span className="font-medium text-foreground">{review.senderWorkspace}</span>
              </p>
            )}
          </>
        )}
      </header>

      {!result &&
        !review &&
        (pending === "open" ? (
          <LoadingSkeleton
            label={messages.openingInvitation}
            className="max-w-lg rounded-xl border bg-card p-5"
          >
            <div className="space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-11 w-52 max-w-full" />
            </div>
          </LoadingSkeleton>
        ) : (
          <section className="grid max-w-lg gap-4 rounded-xl border bg-card p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {messages.openInstruction}
            </p>
            {errorMessage}
            <Button
              type="button"
              className="w-full sm:w-fit"
              onClick={() => void run("open", open)}
            >
              {messages.openForReview}
            </Button>
          </section>
        ))}

      {review && displayedPdf && (
        <>
          {confirm && (
            <h2 ref={confirmationHeading} tabIndex={-1} className="text-xl font-semibold">
              {messages.confirmSignature}
            </h2>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section
              aria-labelledby="recipient-document-title"
              className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="recipient-document-title" className="font-semibold">
                  {messages.documentPreview}
                </h2>
                {pdf && (
                  <a
                    href={pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
                  >
                    {confirm ? messages.openReviewedPdf : messages.openOriginalPdf}
                  </a>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="lg:hidden"
                onClick={() => fieldsHeading.current?.focus()}
              >
                {confirm ? messages.goToConfirmation : messages.goToFields}
              </Button>
              <DocumentPreview
                assets={pdfAssets}
                messages={messages}
                key={confirm ? "reviewed" : "original"}
                source={displayedPdf}
                fields={confirm ? [] : review.fields}
              />
            </section>

            <section
              aria-labelledby="recipient-fields-title"
              className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5"
            >
              <h2
                id="recipient-fields-title"
                ref={fieldsHeading}
                tabIndex={-1}
                className="text-lg font-semibold"
              >
                {confirm ? messages.answerSummary : messages.signingFields}
              </h2>
              {errorMessage}
              {progressSaved && !confirm && (
                <p role="status" className="rounded-lg bg-muted p-3 text-sm">
                  {messages.progressSaved}
                </p>
              )}
              <form onSubmit={reviewAnswers} className="grid gap-4">
                {confirm ? (
                  <dl className="divide-y rounded-lg border">
                    {review.fields.map((field, index) => {
                      const value = values[field.id];
                      const answer =
                        typeof value === "object"
                          ? messages.drawnSignature
                          : typeof value === "boolean"
                            ? value
                              ? messages.checked
                              : "—"
                            : value || "—";
                      return (
                        <div key={field.id} className="space-y-1 p-3">
                          <dt className="text-sm text-muted-foreground">
                            {messages[field.type]} · {messages.page} {field.pageIndex + 1} ·{" "}
                            {messages.field} {index + 1}
                          </dt>
                          <dd className="break-words font-medium">{answer}</dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : (
                  <fieldset disabled={busy} className="grid min-w-0 gap-4">
                    {review.fields.map((field, index) => (
                      <fieldset
                        id={"field-" + field.id}
                        key={field.id}
                        className="grid min-w-0 gap-2 border-b pb-4"
                        tabIndex={-1}
                      >
                        <legend className="font-medium">
                          {field.type === "signature"
                            ? messages.typeSignature
                            : messages[field.type]}
                          {field.required && (
                            <span className="ms-2 text-xs text-muted-foreground">
                              ({messages.requiredField})
                            </span>
                          )}
                        </legend>
                        <p className="text-xs text-muted-foreground">
                          {messages.pageTitle} {field.pageIndex + 1} · {messages.field} {index + 1}
                        </p>
                        {field.type === "signature" || field.type === "initials" ? (
                          <SignatureInput
                            messages={messages}
                            label={messages[field.type]}
                            required={field.required}
                            value={
                              typeof values[field.id] === "boolean"
                                ? ""
                                : ((values[field.id] as string | DrawnSignature) ?? "")
                            }
                            onChange={(value) => updateAnswer(field.id, value)}
                          />
                        ) : (
                          <Input
                            aria-label={messages[field.type]}
                            className={field.type === "checkbox" ? "size-5" : "w-full"}
                            checked={
                              field.type === "checkbox" ? Boolean(values[field.id]) : undefined
                            }
                            value={
                              field.type === "checkbox" ? undefined : String(values[field.id] ?? "")
                            }
                            type={
                              field.type === "checkbox"
                                ? "checkbox"
                                : field.type === "date"
                                  ? "date"
                                  : "text"
                            }
                            maxLength={240}
                            required={field.required}
                            onChange={(event) =>
                              updateAnswer(
                                field.id,
                                field.type === "checkbox"
                                  ? event.target.checked
                                  : event.target.value
                              )
                            }
                          />
                        )}
                      </fieldset>
                    ))}
                    <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                      <input
                        className="mt-0.5 size-5 shrink-0 accent-primary"
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      <span className="break-words">{review.consent}</span>
                    </label>
                  </fieldset>
                )}
                {pending === "prepare" && (
                  <LoadingSkeleton label={messages.preparingPreview}>
                    <Skeleton className="h-6 w-2/3" />
                  </LoadingSkeleton>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button type="submit" disabled={busy}>
                    {pending === "accept"
                      ? messages.submittingSignature
                      : pending === "prepare"
                        ? messages.preparingPreview
                        : confirm
                          ? messages.signAndSubmit
                          : messages.reviewAnswers}
                  </Button>
                  {confirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        returnToFields.current = true;
                        setPrepared(undefined);
                        setError("");
                      }}
                    >
                      {messages.editAnswers}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run("save", async () => {
                          await post("progress", answers());
                          setProgressSaved(true);
                        })
                      }
                    >
                      {pending === "save" ? messages.savingProgress : messages.saveProgress}
                    </Button>
                  )}
                </div>
              </form>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" disabled={busy}>
                    {pending === "decline" ? messages.decliningRequest : messages.declineRequest}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent lang={lang} className="w-[calc(100%-2rem)] rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{messages.confirmDecline}</AlertDialogTitle>
                    <AlertDialogDescription>{messages.declineDescription}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{messages.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-700 text-white hover:bg-red-800"
                      onClick={() => void run("decline", () => finish("decline"))}
                    >
                      {messages.declineRequest}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
