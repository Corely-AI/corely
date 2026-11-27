import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Textarea,
  buttonVariants,
} from "@corely/ui";
import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import { SignCeremonyViewSchema, type SignRequestDraft } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";

export function RequestActions({
  workspace,
  draft,
}: {
  workspace: string;
  draft: SignRequestDraft;
}) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<ReturnType<typeof SignCeremonyViewSchema.parse>>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const [expiry, setExpiry] = useState(() =>
      new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    ),
    [consent, setConsent] = useState(""),
    [invitation, setInvitation] = useState("");
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const reviewSendButton = useRef<HTMLButtonElement>(null);
  const progressHeading = useRef<HTMLHeadingElement>(null);
  const prefix = "/sign/requests/" + draft.requestId;
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void apiClient
      .request(
        prefix + "/progress",
        { headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((v) => {
        if (!controller.signal.aborted) setState(SignCeremonyViewSchema.parse(v));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e));
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
  return (
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
      {state && (
        <>
          <p>
            {t("sign.statusLabel")} · {t("sign.states." + state.status)}
          </p>
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
                setSendConfirmationOpen(true);
              }}
            >
              <label className="grid gap-1 text-sm font-medium">
                {t("sign.expiry")}
                <Input
                  className="w-fit"
                  required
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {t("sign.consentLabel")}
                <Textarea
                  required
                  maxLength={2000}
                  value={consent}
                  onChange={(e) => setConsent(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                {t("sign.invitation")}
                <Textarea
                  maxLength={2000}
                  value={invitation}
                  onChange={(e) => setInvitation(e.target.value)}
                />
              </label>
              <Button
                ref={reviewSendButton}
                className="justify-self-start"
                variant="accent"
                type="submit"
                disabled={busy}
              >
                {t("sign.reviewSend")}
              </Button>
              <AlertDialog open={sendConfirmationOpen} onOpenChange={setSendConfirmationOpen}>
                <AlertDialogContent
                  className="w-[calc(100%-2rem)] max-w-md rounded-lg"
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    const button = reviewSendButton.current;
                    (button && !button.disabled ? button : progressHeading.current)?.focus();
                  }}
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("sign.sendConfirmationTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("sign.confirmSend")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className={buttonVariants({ variant: "accent" })}
                      disabled={busy}
                      onClick={() =>
                        void act("send", {
                          confirm: true,
                          expiresAt: new Date(expiry + "T23:59:59Z").toISOString(),
                          consent,
                          invitation,
                          canonicalSha256: draft.canonicalSha256,
                        })
                      }
                    >
                      {t("sign.sendInvitations")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          ) : (
            <>
              <ul>
                {state.recipients.map((s) => (
                  <li key={s.roleId}>
                    {draft.recipients.find((r) => r.roleId === s.roleId)?.name} ·{" "}
                    {t("sign.states." + s.status)}
                    {s.deliveredAt ? t("sign.providerSent") : ""}
                    {state.status === "SENT" && s.status === "INVITED" && (
                      <Button
                        className="justify-self-start"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(t("sign.confirmRemind")))
                            void act("remind/" + encodeURIComponent(s.roleId), {
                              commandId: crypto.randomUUID(),
                            });
                        }}
                      >
                        {t("sign.reminder")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <h3 className="font-semibold">{t("sign.activity")}</h3>
              <ol className="list-inside list-disc">
                {[
                  { at: state.sentAt, label: t("sign.states.SENT") },
                  ...state.recipients.flatMap((s) => {
                    const name = draft.recipients.find((r) => r.roleId === s.roleId)?.name;
                    return [
                      { at: s.deliveredAt, label: name + " · " + t("sign.providerSent").trim() },
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
              {state.expiresAt && (
                <p>
                  {t("sign.expiry")} ·{" "}
                  <time dateTime={state.expiresAt}>
                    {new Date(state.expiresAt).toLocaleString(i18n.language)}
                  </time>
                </p>
              )}
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
                    if (window.confirm(t("sign.confirmVoid"))) void act("void", {});
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
        className="justify-self-start"
        variant="outline"
        disabled={busy}
        onClick={() => setReload((n) => n + 1)}
      >
        {t("sign.refresh")}
      </Button>
    </section>
  );
}
