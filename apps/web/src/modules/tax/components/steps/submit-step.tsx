import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Link } from "react-router-dom";

type SubmitStepProps = {
  canSubmit: boolean;
  onSubmit: (payload: {
    method: string;
    submissionId: string;
    submittedAt: string;
    notes?: string;
  }) => void;
  isSubmitting?: boolean;
  blockerMessage?: string;
};

const METHODS = [{ label: "Manual", value: "manual" }];

export function SubmitStep({ canSubmit, onSubmit, isSubmitting, blockerMessage }: SubmitStepProps) {
  const [method, setMethod] = React.useState<string>(METHODS[0].value);
  const [submissionId, setSubmissionId] = React.useState("");
  const [submittedAt, setSubmittedAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = React.useState("");

  const handleSubmit = () => {
    if (!submissionId.trim()) {
      return;
    }
    onSubmit({
      method,
      submissionId: submissionId.trim(),
      submittedAt: new Date(submittedAt).toISOString(),
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <div className="space-y-6" data-testid="tax-filing-submit-step">
      <Alert>
        <AlertTitle>Submission method</AlertTitle>
        <AlertDescription>
          Connect your submission method in{" "}
          <Link className="underline" to="/tax/settings#submission">
            Tax Settings
          </Link>{" "}
          to submit directly.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Submission confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Submission reference</Label>
            <Input
              value={submissionId}
              onChange={(event) => setSubmissionId(event.target.value)}
              placeholder="Enter submission ID/reference"
            />
          </div>
          <div className="grid gap-2">
            <Label>Submitted at</Label>
            <Input
              type="datetime-local"
              value={submittedAt}
              onChange={(event) => setSubmittedAt(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note for your records"
            />
          </div>
          {blockerMessage ? <p className="text-sm text-destructive">{blockerMessage}</p> : null}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || !submissionId.trim() || isSubmitting}
          >
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
