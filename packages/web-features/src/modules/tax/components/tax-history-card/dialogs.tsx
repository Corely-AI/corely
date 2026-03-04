import React from "react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@corely/ui";
import { Input, Textarea } from "@corely/ui";
import { formatIsoDate } from "./utils";

import { useTranslation } from "react-i18next";

export function SubmittedDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { submissionDate?: string; reference?: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [submissionDate, setSubmissionDate] = React.useState(
    formatIsoDate(new Date().toISOString())
  );
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSubmissionDate(formatIsoDate(new Date().toISOString()));
      setReference("");
      setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tax.history.dialogs.submitted.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.submitted.date")}</div>
            <Input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t("tax.history.dialogs.submitted.reference")}
            </div>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.submitted.notes")}</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("tax.history.dialogs.cancel")}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                submissionDate: submissionDate ? new Date(submissionDate).toISOString() : undefined,
                reference: reference.trim() || undefined,
                notes: notes.trim() || undefined,
              })
            }
            disabled={isLoading}
          >
            {t("tax.history.dialogs.submitted.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NilDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { submissionDate?: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [submissionDate, setSubmissionDate] = React.useState(
    formatIsoDate(new Date().toISOString())
  );
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSubmissionDate(formatIsoDate(new Date().toISOString()));
      setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tax.history.dialogs.nil.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.nil.date")}</div>
            <Input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.nil.notes")}</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("tax.history.dialogs.cancel")}
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                submissionDate: submissionDate ? new Date(submissionDate).toISOString() : undefined,
                notes: notes.trim() || undefined,
              })
            }
            disabled={isLoading}
          >
            {t("tax.history.dialogs.nil.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { reason: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tax.history.dialogs.archive.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.archive.reason")}</div>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("tax.history.dialogs.archive.notes")}</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("tax.history.dialogs.cancel")}
          </Button>
          <Button
            onClick={() => onSubmit({ reason: reason.trim(), notes: notes.trim() || undefined })}
            disabled={!reason.trim() || isLoading}
          >
            {t("tax.history.dialogs.archive.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
