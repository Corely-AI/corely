import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Link } from "react-router-dom";
import type {
  SubmitTaxFilingRequest,
  TaxSubmissionConnectionStatus,
  TaxSubmissionMethod,
} from "@corely/contracts";

type SubmitStepProps = {
  canSubmit: boolean;
  methods: TaxSubmissionMethod[];
  connectionStatus: TaxSubmissionConnectionStatus;
  onSubmit: (payload: SubmitTaxFilingRequest) => void;
  isSubmitting?: boolean;
  blockerMessage?: string;
};

const METHOD_LABELS: Record<TaxSubmissionMethod, string> = {
  manual: "Manual",
  api: "API",
  elster: "ELSTER",
};

export function SubmitStep({
  canSubmit,
  methods,
  connectionStatus,
  onSubmit,
  isSubmitting,
  blockerMessage,
}: SubmitStepProps) {
  const availableMethods = methods.length > 0 ? methods : (["manual"] as TaxSubmissionMethod[]);
  const [method, setMethod] = React.useState<TaxSubmissionMethod>(availableMethods[0]);
  const [submissionId, setSubmissionId] = React.useState("");
  const [submittedAt, setSubmittedAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!availableMethods.includes(method)) {
      setMethod(availableMethods[0]);
    }
  }, [availableMethods, method]);

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
          {connectionStatus === "connected"
            ? "Your automated submission connection is configured."
            : "Submission connection is not configured."}{" "}
          Manage submission settings in{" "}
          <Link className="underline" to="/tax/settings#submission">
            Tax Settings
          </Link>{" "}
          to enable direct filing.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Submission confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as TaxSubmissionMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMethods.map((value) => (
                  <SelectItem key={value} value={value}>
                    {METHOD_LABELS[value]}
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
            Submit filing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
