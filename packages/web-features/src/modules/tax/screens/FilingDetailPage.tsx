import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { normalizeError } from "@corely/api-client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import type { VatPeriodItem } from "@corely/contracts";
import { FilingDetailHeader } from "../components/filing-detail-header";
import { FilingStepper, type FilingStepKey } from "../components/filing-stepper";
import { ReviewStep } from "../components/steps/review-step";
import { SubmitStep } from "../components/steps/submit-step";
import { PayStep } from "../components/steps/pay-step";
import { IncludedItemsSection } from "../components/included-items-section";
import { AttachmentsSection } from "../components/attachments-section";
import { ActivitySection } from "../components/activity-section";
import { useTaxFilingDetailQuery } from "../hooks/useTaxFilingDetailQuery";
import { useTaxMode } from "../hooks/useTaxMode";
import { useVatPeriodsQuery } from "../hooks/useVatPeriodsQuery";
import {
  useRecalculateFilingMutation,
  useSubmitFilingMutation,
  useMarkPaidFilingMutation,
  useDeleteFilingMutation,
} from "../hooks/useTaxFilingMutations";
import { downloadTaxPdfWithPolling } from "../lib/download-tax-pdf-with-polling";
import { buildFilingFlow, getDefaultStep } from "../lib/filing-flow-config";

export const FilingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useTaxMode();

  const { data, isLoading, isError, error, refetch: refetchDetail } = useTaxFilingDetailQuery(id);
  const filing = data?.filing;

  const [transitionErrorMessage, setTransitionErrorMessage] = React.useState<string | null>(null);
  const [submittedBanner, setSubmittedBanner] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState<FilingStepKey>("review");
  const [presetSourceType, setPresetSourceType] = React.useState<"invoice" | "expense" | undefined>(
    undefined
  );
  const includedItemsRef = React.useRef<HTMLDivElement | null>(null);

  const recalcMutation = useRecalculateFilingMutation(id);
  const submitMutation = useSubmitFilingMutation(id);
  const markPaidMutation = useMarkPaidFilingMutation(id);
  const deleteMutation = useDeleteFilingMutation(id);

  const vatPeriodsEnabled = Boolean(filing && filing.type === "vat" && filing.year);
  const { data: vatPeriodsData } = useVatPeriodsQuery(
    { year: filing?.year ?? new Date().getUTCFullYear() },
    vatPeriodsEnabled
  );

  React.useEffect(() => {
    if (!filing) {
      return;
    }
    setActiveStep(getDefaultStep(filing));
  }, [filing]);

  React.useEffect(() => {
    if (filing?.status !== "submitted") {
      setSubmittedBanner(false);
    }
  }, [filing?.status]);

  const normalizedError = isError ? normalizeError(error) : null;
  const hasBlockers = filing?.issues.some((issue) => issue.severity === "blocker") ?? false;
  const steps = filing ? buildFilingFlow({ mode, filing, hasBlockers }) : [];

  React.useEffect(() => {
    if (!steps.some((step) => step.key === activeStep && !step.disabled)) {
      setActiveStep("review");
    }
  }, [activeStep, steps]);

  const currentPeriodIndex = React.useMemo(() => {
    if (!filing || !vatPeriodsData?.periods || filing.type !== "vat") {
      return -1;
    }
    return vatPeriodsData.periods.findIndex(
      (period) => period.filingId === filing.id || period.periodKey === filing.periodKey
    );
  }, [filing, vatPeriodsData?.periods]);

  const previousPeriod =
    currentPeriodIndex > 0 ? vatPeriodsData?.periods[currentPeriodIndex - 1] : undefined;
  const nextPeriod =
    currentPeriodIndex >= 0 && vatPeriodsData?.periods
      ? vatPeriodsData.periods[currentPeriodIndex + 1]
      : undefined;

  const goToPeriod = (period: VatPeriodItem | undefined) => {
    if (!period || !filing?.year) {
      return;
    }
    if (period.filingId) {
      navigate(`/tax/filings/${period.filingId}`);
      return;
    }
    navigate(`/tax/filings/new?type=vat&periodKey=${period.periodKey}&year=${filing.year}`);
  };

  const setTransitionError = (value: unknown) => {
    const normalized = normalizeError(value);
    if (normalized.status === 409) {
      setTransitionErrorMessage(normalized.detail || "Status transition blocked");
      return true;
    }
    toast.error(normalized.detail || "Operation failed");
    return false;
  };

  const handleHeaderAction = async (actionKey: string) => {
    if (!id || !filing) {
      return;
    }
    if (actionKey === "review") {
      setActiveStep("review");
      return;
    }
    if (actionKey === "markPaid") {
      setActiveStep("pay");
      return;
    }
    if (actionKey === "view") {
      setActiveStep("review");
      return;
    }
    if (actionKey === "recalculate") {
      setTransitionErrorMessage(null);
      try {
        await recalcMutation.mutateAsync();
        toast.success("Recalculation queued");
      } catch (mutationError) {
        setTransitionError(mutationError);
      }
      return;
    }
    if (actionKey === "exportPdf") {
      const abortController = new AbortController();
      const loadingToastId = toast.loading("Generating PDF...");
      try {
        const result = await downloadTaxPdfWithPolling(
          (_signal) => taxApi.getReportPdfUrl(id),
          abortController.signal
        );
        if (result.status === "READY") {
          window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
          toast.success("Download started");
        } else if (result.status === "PENDING") {
          toast.info("PDF is being prepared. Try again shortly.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to export PDF");
      } finally {
        toast.dismiss(loadingToastId);
      }
      return;
    }
    if (actionKey === "exportCsv") {
      toast.info("CSV export coming soon");
      return;
    }
    if (actionKey === "delete") {
      try {
        await deleteMutation.mutateAsync();
        toast.success("Filing deleted");
        navigate("/tax/filings");
      } catch (mutationError) {
        setTransitionError(mutationError);
      }
      return;
    }
    if (actionKey === "previousPeriod") {
      goToPeriod(previousPeriod);
      return;
    }
    if (actionKey === "nextPeriod") {
      goToPeriod(nextPeriod);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !filing) {
    if (normalizedError?.status === 404) {
      return (
        <div className="p-6 lg:p-8 space-y-4">
          <Button variant="ghost" onClick={() => navigate("/tax/filings")}>
            Back to filings
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Filing not found.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/tax/filings")}>
          Back to filings
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              {normalizedError?.detail || "Failed to load filing details."}
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => void refetchDetail()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const backTo = (location.state as { from?: string } | undefined)?.from ?? "/tax/filings";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FilingDetailHeader
        filing={filing}
        onBack={() => navigate(backTo)}
        onAction={handleHeaderAction}
        isLoading={
          recalcMutation.isPending ||
          submitMutation.isPending ||
          markPaidMutation.isPending ||
          deleteMutation.isPending
        }
        periodNavigation={
          filing.type === "vat"
            ? {
                hasPrevious: Boolean(previousPeriod),
                hasNext: Boolean(nextPeriod),
              }
            : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {transitionErrorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Transition blocked</AlertTitle>
            <AlertDescription>{transitionErrorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {submittedBanner ? (
          <Alert>
            <AlertTitle>Submitted</AlertTitle>
            <AlertDescription>Filing submission is recorded successfully.</AlertDescription>
          </Alert>
        ) : null}
        <FilingStepper steps={steps} activeStep={activeStep} onStepChange={setActiveStep} />
        {activeStep === "review" ? (
          <ReviewStep
            totals={filing.totals}
            issues={filing.issues}
            currency={filing.totals?.currency}
            onRecalculate={() => {
              setTransitionErrorMessage(null);
              recalcMutation.mutate(undefined, {
                onError: (mutationError) => {
                  setTransitionError(mutationError);
                },
              });
            }}
            isRecalculating={recalcMutation.isPending}
            onViewIncludedItems={(sourceType) => {
              setPresetSourceType(sourceType);
              includedItemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : null}
        {activeStep === "submit" ? (
          <SubmitStep
            filingId={filing.id}
            exportCapabilities={filing.exports}
            canSubmit={filing.capabilities.canSubmit && !hasBlockers}
            methods={filing.capabilities.submissionMethods}
            connectionStatus={filing.capabilities.submissionConnectionStatus}
            blockerMessage={hasBlockers ? "Resolve blocker issues before submitting." : undefined}
            isSubmitting={submitMutation.isPending}
            onSubmit={async (payload) => {
              setTransitionErrorMessage(null);
              try {
                await submitMutation.mutateAsync(payload);
                toast.success("Filing submitted");
                if (filing.capabilities.paymentsEnabled) {
                  setActiveStep("pay");
                } else {
                  setSubmittedBanner(true);
                }
              } catch (mutationError) {
                setTransitionError(mutationError);
              }
            }}
          />
        ) : null}
        {activeStep === "pay" && filing.capabilities.paymentsEnabled ? (
          <PayStep
            onMarkPaid={async (payload) => {
              setTransitionErrorMessage(null);
              try {
                await markPaidMutation.mutateAsync(payload);
                toast.success("Marked as paid");
              } catch (mutationError) {
                setTransitionError(mutationError);
              }
            }}
            isSubmitting={markPaidMutation.isPending}
            defaultAmountCents={
              filing.totals?.netPayableCents ?? filing.totals?.estimatedTaxDueCents ?? null
            }
            dueDate={filing.dueDate}
            currency={filing.totals?.currency}
            paymentInstructions={filing.paymentInstructions}
          />
        ) : null}
      </div>

      <div className="space-y-6">
        <div ref={includedItemsRef}>
          <IncludedItemsSection
            filingId={filing.id}
            presetSourceType={presetSourceType}
            onPresetSourceTypeCleared={() => setPresetSourceType(undefined)}
          />
        </div>
        <AttachmentsSection filingId={filing.id} />
        <ActivitySection filingId={filing.id} />
      </div>
    </div>
  );
};
