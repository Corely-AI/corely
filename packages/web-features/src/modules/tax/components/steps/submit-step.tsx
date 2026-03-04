import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, normalizeError } from "@corely/api-client";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type {
  TaxFilingExportKind,
  TaxFilingExports,
  SubmitTaxFilingRequest,
  TaxSubmissionConnectionStatus,
  TaxSubmissionMethod,
} from "@corely/contracts";

type SubmitStepProps = {
  filingId: string;
  exportCapabilities?: TaxFilingExports;
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

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export function SubmitStep({
  filingId,
  exportCapabilities,
  canSubmit,
  methods,
  connectionStatus,
  onSubmit,
  isSubmitting,
  blockerMessage,
}: SubmitStepProps) {
  const { t } = useTranslation();
  const availableMethods = methods.length > 0 ? methods : (["manual"] as TaxSubmissionMethod[]);
  const [method, setMethod] = React.useState<TaxSubmissionMethod>(availableMethods[0]);
  const [submissionId, setSubmissionId] = React.useState("");
  const [submittedAt, setSubmittedAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = React.useState("");
  const [activeExport, setActiveExport] = React.useState<TaxFilingExportKind | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const methodLabels = React.useMemo<Record<TaxSubmissionMethod, string>>(
    () => ({
      manual: t("tax.submitStep.methods.manual"),
      api: t("tax.submitStep.methods.api"),
      elster: t("tax.submitStep.methods.elster"),
    }),
    [t]
  );

  React.useEffect(() => {
    if (!availableMethods.includes(method)) {
      setMethod(availableMethods[0]);
    }
  }, [availableMethods, method]);

  const handleExport = React.useCallback(
    async (kind: TaxFilingExportKind) => {
      if (!filingId) {
        return;
      }

      setExportError(null);
      setActiveExport(kind);
      try {
        const downloaded =
          kind === "ELSTER_USTVA_XML"
            ? await taxApi.downloadFilingElsterXml(filingId)
            : await taxApi.downloadFilingKennzifferCsv(filingId);
        triggerBrowserDownload(downloaded.blob, downloaded.filename);
        toast.success(
          kind === "ELSTER_USTVA_XML"
            ? t("tax.submitStep.export.success.elsterXml")
            : t("tax.submitStep.export.success.kennzifferCsv")
        );
      } catch (error) {
        const normalized = error instanceof ApiError ? error : normalizeError(error);
        const message = normalized.detail || t("tax.submitStep.export.errors.generic");
        setExportError(message);
        toast.error(message);
      } finally {
        setActiveExport(null);
      }
    },
    [filingId, t]
  );

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
      <Card>
        <CardHeader>
          <CardTitle>{t("tax.submitStep.export.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("tax.submitStep.export.description")}</p>
          <div className="flex flex-wrap gap-2">
            {exportCapabilities?.canExportElsterXml ? (
              <Button
                data-testid="tax-export-elster-xml"
                disabled={activeExport !== null}
                onClick={() => void handleExport("ELSTER_USTVA_XML")}
              >
                {activeExport === "ELSTER_USTVA_XML" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {activeExport === "ELSTER_USTVA_XML"
                  ? t("tax.submitStep.export.actions.loading")
                  : t("tax.submitStep.export.actions.elsterXml")}
              </Button>
            ) : null}
            {exportCapabilities?.canExportKennzifferCsv ? (
              <Button
                variant="outline"
                data-testid="tax-export-kennziffer-csv"
                disabled={activeExport !== null}
                onClick={() => void handleExport("USTVA_KENNZIFFER_CSV")}
              >
                {activeExport === "USTVA_KENNZIFFER_CSV" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {activeExport === "USTVA_KENNZIFFER_CSV"
                  ? t("tax.submitStep.export.actions.loading")
                  : t("tax.submitStep.export.actions.kennzifferCsv")}
              </Button>
            ) : null}
          </div>
          {!exportCapabilities?.canExportElsterXml &&
          !exportCapabilities?.canExportKennzifferCsv ? (
            <p className="text-sm text-muted-foreground">
              {t("tax.submitStep.export.unavailable")}
            </p>
          ) : null}
          {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>{t("tax.submitStep.connection.title")}</AlertTitle>
        <AlertDescription>
          {connectionStatus === "connected"
            ? t("tax.submitStep.connection.connected")
            : t("tax.submitStep.connection.notConfigured")}{" "}
          {t("tax.submitStep.connection.manageIn")}{" "}
          <Link className="underline" to="/tax/settings#submission">
            {t("tax.submitStep.connection.settingsLink")}
          </Link>{" "}
          {t("tax.submitStep.connection.enableDirectFiling")}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("tax.submitStep.confirmation.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>{t("tax.submitStep.confirmation.method")}</Label>
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
                    {methodLabels[value] ?? METHOD_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("tax.submitStep.confirmation.reference")}</Label>
            <Input
              value={submissionId}
              onChange={(event) => setSubmissionId(event.target.value)}
              placeholder={t("tax.submitStep.confirmation.referencePlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("tax.submitStep.confirmation.submittedAt")}</Label>
            <Input
              type="datetime-local"
              value={submittedAt}
              onChange={(event) => setSubmittedAt(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("tax.submitStep.confirmation.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("tax.submitStep.confirmation.notesPlaceholder")}
            />
          </div>
          {blockerMessage ? <p className="text-sm text-destructive">{blockerMessage}</p> : null}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || !submissionId.trim() || isSubmitting}
          >
            {t("tax.submitStep.confirmation.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
