import { useTranslation } from "react-i18next";
import { useInvoicesApi } from "../invoice-runtime";
import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { SessionRequestError } from "@corely/web-shared/session/session-client";
import type {
  DraftInvoiceIssueEmailOutput,
  DraftInvoiceReminderEmailOutput,
  InvoiceEmailDraftLanguage,
  InvoiceReminderEmailDraftTone,
  InvoiceStatus,
} from "@corely/contracts";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner";

type DraftPayload = DraftInvoiceIssueEmailOutput | DraftInvoiceReminderEmailOutput;

type DraftType = "issue" | "reminder";

type Props = {
  invoiceId: string;
  invoiceStatus: InvoiceStatus;
  amountDueCents: number;
  defaultLanguage: InvoiceEmailDraftLanguage;
};

const ISSUE_TONE = "friendly" as const;

export function InvoiceCopilotPanel({
  invoiceId,
  invoiceStatus,
  amountDueCents,
  defaultLanguage,
}: Props) {
  const { t } = useTranslation();
  const invoicesApi = useInvoicesApi();
  const [language, setLanguage] = useState<InvoiceEmailDraftLanguage>(defaultLanguage);
  const [reminderTone, setReminderTone] = useState<InvoiceReminderEmailDraftTone>("normal");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<DraftType>("issue");
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [open, setOpen] = useState(false);

  const draftIssueMutation = useMutation({
    mutationFn: () =>
      invoicesApi.draftIssueEmail(invoiceId, {
        language,
        tone: ISSUE_TONE,
      }),
    onSuccess: (payload) => {
      setErrorMessage(null);
      setDraftType("issue");
      setDraft(payload);
      setOpen(true);
    },
    onError: (error) => {
      const apiError = normalizeError(error);
      const detail = error instanceof SessionRequestError ? error.message : apiError.detail;
      setErrorMessage(detail);
      toast.error(detail);
    },
  });

  const draftReminderMutation = useMutation({
    mutationFn: () =>
      invoicesApi.draftReminderEmail(invoiceId, {
        language,
        tone: reminderTone,
      }),
    onSuccess: (payload) => {
      setErrorMessage(null);
      setDraftType("reminder");
      setDraft(payload);
      setOpen(true);
    },
    onError: (error) => {
      const apiError = normalizeError(error);
      const detail = error instanceof SessionRequestError ? error.message : apiError.detail;
      setErrorMessage(detail);
      toast.error(detail);
    },
  });

  const isDrafting = draftIssueMutation.isPending || draftReminderMutation.isPending;
  const canDraftIssue = invoiceStatus === "ISSUED" || invoiceStatus === "SENT";
  const canDraftReminder = canDraftIssue && amountDueCents > 0;

  const modalTitle = useMemo(() => {
    return draftType === "issue"
      ? t("invoices.focused.copilot.issue")
      : t("invoices.focused.copilot.reminder");
  }, [draftType, t]);

  const updateDraft = (patch: Partial<DraftPayload>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error(t("invoices.focused.copilot.copyError"));
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Copilot</h3>
              <p className="text-sm text-muted-foreground">{t("invoices.focused.copilot.intro")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("invoices.focused.copilot.language")}</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as InvoiceEmailDraftLanguage)}
              >
                <SelectTrigger aria-label={t("invoices.focused.copilot.language")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">{t("invoices.focused.copilot.de")}</SelectItem>
                  <SelectItem value="vi">{t("invoices.focused.copilot.vi")}</SelectItem>
                  <SelectItem value="en">{t("invoices.focused.copilot.en")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("invoices.focused.copilot.tone")}</Label>
              <Select
                value={reminderTone}
                onValueChange={(value) => setReminderTone(value as InvoiceReminderEmailDraftTone)}
              >
                <SelectTrigger aria-label={t("invoices.focused.copilot.tone")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polite">{t("invoices.focused.copilot.polite")}</SelectItem>
                  <SelectItem value="normal">{t("invoices.focused.copilot.normal")}</SelectItem>
                  <SelectItem value="firm">{t("invoices.focused.copilot.firm")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="accent"
              onClick={() => {
                setErrorMessage(null);
                draftIssueMutation.mutate();
              }}
              disabled={isDrafting || !canDraftIssue}
            >
              {draftIssueMutation.isPending
                ? t("invoices.focused.copilot.drafting")
                : t("invoices.focused.copilot.issue")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setErrorMessage(null);
                draftReminderMutation.mutate();
              }}
              disabled={isDrafting || !canDraftReminder}
            >
              {draftReminderMutation.isPending
                ? t("invoices.focused.copilot.drafting")
                : t("invoices.focused.copilot.reminder")}
            </Button>
          </div>

          {!canDraftIssue ? (
            <p className="text-sm text-muted-foreground">
              {t("invoices.focused.copilot.issueDisabled")}
            </p>
          ) : null}

          {canDraftIssue && !canDraftReminder ? (
            <p className="text-sm text-muted-foreground">
              {t("invoices.focused.copilot.reminderDisabled")}
            </p>
          ) : null}

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>{t("invoices.focused.copilot.review")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="copilot-draft-subject">{t("invoices.focused.copilot.subject")}</Label>
              <Input
                id="copilot-draft-subject"
                value={draft?.subject ?? ""}
                onChange={(event) => updateDraft({ subject: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyText(draft?.subject ?? "", t("invoices.focused.copilot.subjectCopied"))
                }
              >
                {t("invoices.focused.copilot.copySubject")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copilot-draft-body">{t("invoices.focused.copilot.body")}</Label>
              <Textarea
                id="copilot-draft-body"
                rows={12}
                value={draft?.body ?? ""}
                onChange={(event) => updateDraft({ body: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyText(draft?.body ?? "", t("invoices.focused.copilot.bodyCopied"))
                }
              >
                {t("invoices.focused.copilot.copyBody")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("invoices.focused.copilot.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
