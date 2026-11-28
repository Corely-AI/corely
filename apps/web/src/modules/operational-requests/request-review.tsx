import { useRef, useState } from "react";
import {
  ApplyOperationalRequestSchema,
  DecideOperationalRequestSchema,
  type OperationalRequest,
  type OperationalRequestDecision,
} from "@corely/contracts";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import { formatDate, type RequestsCopy } from "./requests-copy";

type ReviewConfirmation =
  | { kind: "decision"; decision: OperationalRequestDecision }
  | { kind: "apply" };

export function RequestReview({
  request,
  copy,
  locale,
  pending,
  decide,
  apply,
}: {
  request: OperationalRequest;
  copy: RequestsCopy;
  locale: string;
  pending: boolean;
  decide: (decision: OperationalRequestDecision, note: string | null) => void;
  apply: (timezone: string) => void;
}) {
  const [note, setNote] = useState("");
  const [timezone, setTimezone] = useState("");
  const [invalid, setInvalid] = useState("");
  const [confirm, setConfirm] = useState<ReviewConfirmation | null>(null);
  const application = request.application;
  const opener = useRef<HTMLButtonElement | null>(null);
  const reviewSection = useRef<HTMLDivElement>(null);

  function review(decision: OperationalRequestDecision, trigger: HTMLButtonElement) {
    const input = DecideOperationalRequestSchema.safeParse({
      version: request.version,
      decision,
      note: note.trim() || null,
    });
    if (!input.success) {
      setInvalid(copy.decisionNoteRequired);
      return;
    }
    setInvalid("");
    opener.current = trigger;
    setConfirm({ kind: "decision", decision });
  }

  function chooseApplication(trigger: HTMLButtonElement) {
    const input = ApplyOperationalRequestSchema.safeParse({
      version: request.version,
      timezone: timezone.trim(),
    });
    if (!input.success) {
      setInvalid(copy.timezoneInvalid);
      return;
    }
    setInvalid("");
    opener.current = trigger;
    setConfirm({ kind: "apply" });
  }

  const labels = {
    SUBMIT: copy.reviewSubmitted,
    APPROVE: copy.approved,
    REJECT: copy.rejected,
    RETURN: copy.returned,
  };
  const confirmLabel =
    confirm?.kind === "apply"
      ? copy.applyAbsence
      : confirm &&
        { APPROVE: copy.approve, REJECT: copy.reject, RETURN: copy.returnForInformation }[
          confirm.decision
        ];
  const confirmText =
    confirm?.kind === "apply"
      ? copy.applyConfirm
      : confirm &&
        { APPROVE: copy.approveConfirm, REJECT: copy.rejectConfirm, RETURN: copy.returnConfirm }[
          confirm.decision
        ];
  return (
    <div className="space-y-4" ref={reviewSection} tabIndex={-1}>
      {(request.review.length > 0 || application) && (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">{copy.reviewHistory}</h2>
            {request.review.length > 0 && (
              <ol className="divide-y divide-border">
                {request.review.map((entry) => (
                  <li key={entry.version} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <strong className="text-sm">{labels[entry.action]}</strong>
                      <time dateTime={entry.at} className="text-sm text-muted-foreground">
                        {formatDate(entry.at, locale)}
                      </time>
                    </div>
                    {entry.note && (
                      <p className="break-words whitespace-pre-wrap text-sm">{entry.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {application?.status === "PENDING" && <p role="status">{copy.pendingApplication}</p>}
            {application?.status === "FAILED" && (
              <Alert className="border-destructive/70 text-foreground" role="alert">
                <AlertDescription>
                  {application.failure === "REJECTED_BY_PEOPLE"
                    ? copy.applicationRejected
                    : copy.applicationUnavailable}
                </AlertDescription>
              </Alert>
            )}
            {application?.status === "APPLIED" && (
              <p role="status">
                {copy.applied}{" "}
                <time className="ml-2 text-sm text-muted-foreground" dateTime={application.at}>
                  {formatDate(application.at, locale)}
                </time>
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {(request.actions?.canDecide || request.actions?.canApply) && (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {request.actions.canDecide ? (
              <>
                <h2 className="text-lg font-semibold">{copy.decisionTitle}</h2>
                <div className="space-y-2">
                  <Label htmlFor="reviewer-note">{copy.reviewerNote}</Label>
                  <Textarea
                    id="reviewer-note"
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    readOnly={pending}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={pending}
                    onClick={(event) => review("APPROVE", event.currentTarget)}
                  >
                    {copy.approve}
                  </Button>
                  <Button
                    disabled={pending}
                    variant="outline"
                    onClick={(event) => review("RETURN", event.currentTarget)}
                  >
                    {copy.returnForInformation}
                  </Button>
                  <Button
                    disabled={pending}
                    variant="outline"
                    onClick={(event) => review("REJECT", event.currentTarget)}
                  >
                    {copy.reject}
                  </Button>
                </div>
              </>
            ) : (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="absence-timezone">{copy.timezone}</Label>
                <Input
                  id="absence-timezone"
                  type="text"
                  placeholder="Europe/Berlin"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  readOnly={pending}
                />
                <Button
                  disabled={pending}
                  onClick={(event) => chooseApplication(event.currentTarget)}
                >
                  {application?.status === "FAILED" ? copy.retryApplication : copy.applyAbsence}
                </Button>
              </div>
            )}
            {invalid && (
              <p role="alert" className="text-sm">
                {invalid}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <AlertDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
          }
        }}
      >
        <AlertDialogContent
          className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto sm:w-full"
          onCloseAutoFocus={(event) => {
            const trigger = opener.current;
            opener.current = null;
            event.preventDefault();
            if (trigger?.isConnected && !trigger.disabled) {
              trigger.focus();
            } else {
              reviewSection.current?.focus();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmLabel}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) {
                  return;
                }
                if (confirm.kind === "apply") {
                  apply(timezone.trim());
                } else {
                  decide(confirm.decision, note.trim() || null);
                }
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
