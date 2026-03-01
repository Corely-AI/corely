import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
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
import { invoicesApi } from "@corely/web-shared/lib/invoices-api";

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
      setErrorMessage(apiError.detail);
      toast.error(apiError.detail);
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
      setErrorMessage(apiError.detail);
      toast.error(apiError.detail);
    },
  });

  const isDrafting = draftIssueMutation.isPending || draftReminderMutation.isPending;
  const canDraftIssue = invoiceStatus === "ISSUED" || invoiceStatus === "SENT";
  const canDraftReminder = canDraftIssue && amountDueCents > 0;

  const modalTitle = useMemo(() => {
    return draftType === "issue" ? "Draft invoice email" : "Draft reminder";
  }, [draftType]);

  const updateDraft = (patch: Partial<DraftPayload>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Unable to copy to clipboard");
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Copilot</h3>
              <p className="text-sm text-muted-foreground">
                Generate a draft email for review. Copilot does not send emails automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={language}
                onValueChange={(value) => setLanguage(value as InvoiceEmailDraftLanguage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">German (de)</SelectItem>
                  <SelectItem value="vi">Vietnamese (vi)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reminder tone</Label>
              <Select
                value={reminderTone}
                onValueChange={(value) => setReminderTone(value as InvoiceReminderEmailDraftTone)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polite">Polite</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="firm">Firm</SelectItem>
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
              {draftIssueMutation.isPending ? "Drafting..." : "Draft invoice email"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setErrorMessage(null);
                draftReminderMutation.mutate();
              }}
              disabled={isDrafting || !canDraftReminder}
            >
              {draftReminderMutation.isPending ? "Drafting..." : "Draft reminder"}
            </Button>
          </div>

          {!canDraftIssue ? (
            <p className="text-sm text-muted-foreground">
              Invoice must be ISSUED or SENT before drafting email copy.
            </p>
          ) : null}

          {canDraftIssue && !canDraftReminder ? (
            <p className="text-sm text-muted-foreground">
              Reminder draft is available only when amount due is greater than zero.
            </p>
          ) : null}

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              Review and edit the draft before copy/pasting it into your send flow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="copilot-draft-subject">Subject</Label>
              <Input
                id="copilot-draft-subject"
                value={draft?.subject ?? ""}
                onChange={(event) => updateDraft({ subject: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyText(draft?.subject ?? "", "Subject copied")}
              >
                Copy subject
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copilot-draft-body">Body</Label>
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
                onClick={() => copyText(draft?.body ?? "", "Body copied")}
              >
                Copy body
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
