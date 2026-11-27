import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  buttonVariants,
  LoadingSkeleton,
} from "@corely/ui";
import type { SignRequestDraft } from "@corely/contracts";
import { lazy, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const RequestDocumentPreview = lazy(() => import("./request-document-preview"));

export function RequestReview({
  draft,
  workspace,
  expiresAt,
  invitation,
  consent,
  busy,
  onOpenChange,
  onCloseAutoFocus,
  onSend,
}: {
  draft: SignRequestDraft;
  workspace: string;
  expiresAt: string;
  invitation: string;
  consent: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  onSend: () => void;
}) {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(expiresAt));

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg p-4 sm:p-6"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("sign.reviewSend")}</AlertDialogTitle>
          <AlertDialogDescription>{t("sign.reviewSendDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="min-w-0 space-y-4">
              <ReviewSection title={t("sign.recipientsTitle")}>
                <p>{t("sign." + draft.routing + "Delivery")}</p>
                <ol className="ml-5 list-decimal space-y-2">
                  {draft.recipients.map((recipient) => (
                    <li key={recipient.roleId}>
                      <div className="break-words font-medium text-foreground">
                        {recipient.name}
                      </div>
                      <div className="break-all">{recipient.email}</div>
                    </li>
                  ))}
                </ol>
              </ReviewSection>
              <ReviewSection title={t("sign.expiry")}>
                <time dateTime={expiresAt}>{date}</time>
              </ReviewSection>
              <ReviewSection title={t("sign.invitation")}>
                {invitation.trim() || t("sign.noInvitationMessage")}
              </ReviewSection>
              <ReviewSection title={t("sign.consentLabel")}>{consent.trim()}</ReviewSection>
            </div>
            <div className="min-w-0 self-start space-y-3">
              <h3 className="font-medium">{t("sign.pdf")}</h3>
              <Suspense fallback={<LoadingSkeleton label={t("sign.opening")} variant="detail" />}>
                <RequestDocumentPreview draft={draft} workspace={workspace} />
              </Suspense>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "accent" })}
            disabled={busy}
            onClick={onSend}
          >
            {t("sign.sendInvitations")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5 rounded-lg border bg-card p-3">
      <h3 className="font-medium">{title}</h3>
      <div className="space-y-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
