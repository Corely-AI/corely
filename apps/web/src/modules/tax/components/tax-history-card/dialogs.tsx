import React from "react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@corely/ui";
import { Input, Textarea } from "@corely/ui";
import { formatIsoDate } from "./utils";

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
          <DialogTitle>Mark period as submitted</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Submission date</div>
            <Input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Reference (optional)</div>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Notes (optional)</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
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
            Submit period
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
          <DialogTitle>Mark period as nil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Submission date</div>
            <Input
              type="date"
              value={submissionDate}
              onChange={(e) => setSubmissionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Notes (optional)</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
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
            Mark nil
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
          <DialogTitle>Archive period</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Reason</div>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Notes (optional)</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ reason: reason.trim(), notes: notes.trim() || undefined })}
            disabled={!reason.trim() || isLoading}
          >
            Archive period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
