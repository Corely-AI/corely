import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Input,
  Textarea,
} from "@corely/ui";
import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import {
  SignCeremonyViewSchema,
  SignRequestDraftSchema,
  type SignRequestDraft,
} from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { Link, useNavigate } from "react-router-dom";
import { RequestProgressSkeleton } from "./request-loading";
import { RequestReview } from "./request-review";
import { SignerMark } from "./signer-colors";
import type { RequestEditStep } from "./request-draft-editor";

export function RequestActions({
  workspace,
  draft,
  onEdit,
}: {
  workspace: string;
  draft: SignRequestDraft;
  onEdit?: (step: RequestEditStep) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const savedSettings = draft.configuration?.settings;
  const [state, setState] = useState<ReturnType<typeof SignCeremonyViewSchema.parse>>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [expiry, setExpiry] = useState(() =>
      savedSettings
        ? (savedSettings.expiresAt?.slice(0, 10) ?? "")
        : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    ),
    [consent, setConsent] = useState(savedSettings?.consent ?? ""),
    [invitation, setInvitation] = useState(savedSettings?.invitation ?? "");
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [reminderRecipient, setReminderRecipient] =
    useState<SignRequestDraft["recipients"][number]>();
  const reviewSendButton = useRef<HTMLButtonElement>(null);
  const reminderButton = useRef<HTMLButtonElement>(null);
  const progressHeading = useRef<HTMLHeadingElement>(null);
  const prefix = "/sign/requests/" + draft.requestId;
  const layout = draft.configuration?.layout;
  const missingSignatures = layout?.roles.some(
    (role) =>
      !layout.fields.some(
        (field) => field.roleId === role.id && field.type === "signature" && field.required
      )
  );
  const missingSettings =
    savedSettings &&
    (!savedSettings.consent ||
      !savedSettings.expiresAt ||
      Date.parse(savedSettings.expiresAt) <= Date.now());
  const canReplace =
    !draft.workflowManaged &&
    state &&
    ["SENT", "EXPIRED", "VOID", "DECLINED"].includes(state.status);
  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingProgress(true);
    setError("");
    void apiClient
      .request(
        prefix + "/progress",
        { headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((v) => {
        if (!controller.signal.aborted) {
          setState(SignCeremonyViewSchema.parse(v));
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(String(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingProgress(false);
        }
      });
    return () => controller.abort();
  }, [prefix, workspace, reload]);
  async function act(action: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      await apiClient.request(
        prefix + "/" + action,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Workspace-Id": workspace },
          body: JSON.stringify(body),
        },
        { workspaceScope: "none", idempotencyKey: crypto.randomUUID(), parseJson: false }
      );
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  async function prepareReplacement() {
    setBusy(true);
    setError("");
    try {
      const value = await apiClient.request(
        prefix + "/replacement",
        { method: "POST", headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none" }
      );
      const replacement = SignRequestDraftSchema.parse(value);
      navigate("/sign/requests/" + replacement.requestId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("sign.saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="space-y-2">
        <h1 className="break-words text-h1 text-foreground">{draft.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {state && (
            <Badge variant="secondary">
              {t("sign.statusLabel")} · {t("sign.states." + state.status)}
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">
            {t("sign.revision", { revision: draft.templateRevision })} ·{" "}
            {t("sign." + draft.routing)}
          </p>
          {state?.expiresAt && (
            <p className="text-sm text-muted-foreground">
              {t("sign.expiry")} ·{" "}
              <time dateTime={state.expiresAt}>
                {new Date(state.expiresAt).toLocaleString(i18n.language, { timeZone: "UTC" })}
              </time>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onEdit && !draft.workflowManaged && state?.status === "DRAFT" && (
            <Button
              variant="outline"
              disabled={busy || isLoadingProgress}
              onClick={() => onEdit("recipientsTitle")}
            >
              {t("sign.editRequest")}
            </Button>
          )}
          {canReplace && (
            <Button
              variant="outline"
              disabled={busy || isLoadingProgress}
              onClick={() => void prepareReplacement()}
            >
              {t("sign.createReplacement")}
            </Button>
          )}
          {draft.replacesRequestId && (
            <Button variant="link" asChild>
              <Link to={"/sign/requests/" + draft.replacesRequestId}>
                {t("sign.originalRequest")}
              </Link>
            </Button>
          )}
        </div>
      </header>
      <section className="max-w-4xl rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("sign.recipientsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("sign." + draft.routing + "Delivery")}
        </p>
        <ol className="mt-3 divide-y border-y">
          {draft.recipients.map((person, index) => {
            const signer = state?.recipients.find(
              (recipient) => recipient.roleId === person.roleId
            );
            const canRemind = state?.status === "SENT" && signer?.status === "INVITED";
            const waitingTurn =
              state?.status === "SENT" &&
              signer?.status === "WAITING" &&
              draft.routing === "sequential";
            return (
              <li
                key={person.roleId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 max-w-full">
                  <p className="flex items-center gap-2 font-medium">
                    <SignerMark
                      index={layout?.roles.findIndex((role) => role.id === person.roleId) ?? index}
                    />
                    <span className="min-w-0 break-words">
                      {draft.routing === "sequential" && index + 1 + ". "}
                      {person.name}
                    </span>
                  </p>
                  <p className="break-all text-sm text-muted-foreground">{person.email}</p>
                  {signer?.deliveredAt && (
                    <p className="text-sm text-muted-foreground">{t("sign.providerAccepted")}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {signer && (
                    <Badge variant={signer.status === "ACCEPTED" ? "default" : "secondary"}>
                      {canRemind
                        ? t("sign.needsToSign")
                        : waitingTurn
                          ? t("sign.waitingForPriorSigner")
                          : t("sign.states." + signer.status)}
                    </Badge>
                  )}
                  {canRemind && (
                    <Button
                      variant="outline"
                      disabled={busy || isLoadingProgress}
                      onClick={(event) => {
                        reminderButton.current = event.currentTarget;
                        setReminderRecipient(person);
                      }}
                    >
                      {t("sign.reminder")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      {reminderRecipient && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setReminderRecipient(undefined);
            }
          }}
        >
          <AlertDialogContent
            className="w-[calc(100%-2rem)] rounded-lg"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const button = reminderButton.current;
              (button && !button.disabled ? button : progressHeading.current)?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{t("sign.reminder")}</AlertDialogTitle>
              <AlertDialogDescription className="break-words">
                {reminderRecipient.email} · {t("sign.confirmRemind")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void act("remind/" + encodeURIComponent(reminderRecipient.roleId), {
                    commandId: crypto.randomUUID(),
                  })
                }
              >
                {t("sign.reminder")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <section className="grid max-w-4xl gap-4 rounded-lg border bg-card p-5 shadow-sm">
        <h2 ref={progressHeading} tabIndex={-1} className="text-xl font-semibold">
          {t("sign.progressTitle")}
        </h2>
        <Button
          className="justify-self-start"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            try {
              const file = await apiClient.request<{ base64: string }>(
                prefix + "/source",
                { headers: { "X-Workspace-Id": workspace } },
                { workspaceScope: "none" }
              );
              const url = URL.createObjectURL(
                new Blob([Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))], {
                  type: "application/pdf",
                })
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "request-original.pdf";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
              setError(t("sign.sourceError"));
            }
          }}
        >
          {t("sign.reviewOriginal")}
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {!state && isLoadingProgress && <RequestProgressSkeleton />}
        {state && (
          <>
            {state.finalizationFailed && (
              <p role="status">
                {t("sign.needsAttention")}
                <Button
                  className="justify-self-start"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void act("retry", {})}
                >
                  {t("sign.retryFinal")}
                </Button>
              </p>
            )}
            {state.status === "DRAFT" ? (
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!missingSignatures && !missingSettings && !busy && !isLoadingProgress) {
                    setSendConfirmationOpen(true);
                  }
                }}
              >
                <label className="grid gap-1 text-sm font-medium">
                  {t("sign.expiry")}
                  <Input
                    className="w-fit"
                    required
                    readOnly={Boolean(savedSettings)}
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  {t("sign.consentLabel")}
                  <Textarea
                    required
                    readOnly={Boolean(savedSettings)}
                    maxLength={2000}
                    value={consent}
                    onChange={(e) => setConsent(e.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  {t("sign.invitation")}
                  <Textarea
                    maxLength={2000}
                    readOnly={Boolean(savedSettings)}
                    value={invitation}
                    onChange={(e) => setInvitation(e.target.value)}
                  />
                </label>
                {onEdit && savedSettings && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={() => onEdit("requestSettings")}>
                      {t("sign.editRequestSettings")}
                    </Button>
                    {missingSettings && (
                      <p className="text-sm">{t("sign.completeRequestSettings")}</p>
                    )}
                    {missingSignatures && (
                      <Button variant="outline" onClick={() => onEdit("placeFields")}>
                        {t("sign.finishPlacingSignatures")}
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  ref={reviewSendButton}
                  className="justify-self-start"
                  variant="accent"
                  type="submit"
                  disabled={busy || isLoadingProgress || missingSignatures || missingSettings}
                >
                  {t("sign.reviewSend")}
                </Button>
                {sendConfirmationOpen && (
                  <RequestReview
                    draft={draft}
                    workspace={workspace}
                    expiresAt={
                      savedSettings?.expiresAt ?? new Date(expiry + "T23:59:59Z").toISOString()
                    }
                    consent={consent}
                    invitation={invitation}
                    busy={busy}
                    onOpenChange={setSendConfirmationOpen}
                    onCloseAutoFocus={(event) => {
                      event.preventDefault();
                      const button = reviewSendButton.current;
                      (button && !button.disabled ? button : progressHeading.current)?.focus();
                    }}
                    onSend={() =>
                      void act("send", {
                        confirm: true,
                        expiresAt:
                          savedSettings?.expiresAt ?? new Date(expiry + "T23:59:59Z").toISOString(),
                        consent,
                        invitation,
                        canonicalSha256: draft.canonicalSha256,
                        ...(draft.configuration
                          ? { draftRevision: draft.configuration.revision }
                          : {}),
                        ...(draft.replacesRequestId ? { confirmReplacement: true } : {}),
                      })
                    }
                  />
                )}
              </form>
            ) : (
              <>
                <h3 className="font-semibold">{t("sign.activity")}</h3>
                <ol className="list-inside list-disc">
                  {[
                    { at: state.sentAt, label: t("sign.states.SENT") },
                    ...state.recipients.flatMap((s) => {
                      const name = draft.recipients.find((r) => r.roleId === s.roleId)?.name;
                      return [
                        { at: s.deliveredAt, label: name + " · " + t("sign.providerAccepted") },
                        { at: s.acceptedAt, label: name + " · " + t("sign.states.ACCEPTED") },
                      ];
                    }),
                    { at: state.verifiedAt, label: t("sign.states.COMPLETED") },
                  ]
                    .filter((event) => event.at)
                    .sort((a, b) => a.at!.localeCompare(b.at!))
                    .map((event, index) => (
                      <li key={index}>
                        {event.label} ·{" "}
                        <time dateTime={event.at!}>
                          {new Date(event.at!).toLocaleString(i18n.language)}
                        </time>
                      </li>
                    ))}
                </ol>
                {state.status === "COMPLETED" &&
                  (["artifact", "evidence"] as const).map((kind) => (
                    <Button
                      className="justify-self-start"
                      variant="outline"
                      key={kind}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const file = await apiClient.request<{ base64: string }>(
                            prefix + "/" + kind,
                            { headers: { "X-Workspace-Id": workspace } },
                            { workspaceScope: "none" }
                          );
                          const blob = new Blob(
                            [Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0))],
                            { type: kind === "artifact" ? "application/pdf" : "application/zip" }
                          );
                          const url = URL.createObjectURL(blob),
                            a = document.createElement("a");
                          a.href = url;
                          a.download =
                            kind === "artifact" ? "signed-document.pdf" : "sign-evidence.zip";
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        } catch {
                          setError(t("sign.downloadError"));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {kind === "artifact" ? t("sign.download") : t("sign.export")}
                    </Button>
                  ))}
                {state.status === "SENT" && (
                  <Button
                    className="justify-self-start"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("sign.confirmVoid"))) {
                        void act("void", {});
                      }
                    }}
                  >
                    {t("sign.void")}
                  </Button>
                )}
              </>
            )}
          </>
        )}
        <Button
          className="justify-self-start aria-disabled:opacity-50"
          variant="outline"
          disabled={busy}
          aria-disabled={isLoadingProgress}
          onClick={() => {
            if (!isLoadingProgress) {
              setReload((n) => n + 1);
            }
          }}
        >
          {t("sign.refresh")}
        </Button>
      </section>
    </>
  );
}
