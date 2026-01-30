import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/shared/components/Skeleton";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { taxApi } from "@/lib/tax-api";
import type { TaxFilingItemSourceType } from "@corely/contracts";
import { FilingDetailHeader } from "../components/filing-detail-header";
import { FilingStepper, type FilingStepKey } from "../components/filing-stepper";
import { ReviewStepIncomeAnnual } from "../components/steps/review-step-income-annual";
import { SubmitStep } from "../components/steps/submit-step";
import { PayStep } from "../components/steps/pay-step";
import { IncludedItemsSection } from "../components/included-items-section";
import { AttachmentsSection } from "../components/attachments-section";
import { ActivitySection } from "../components/activity-section";
import { useTaxFilingDetailQuery } from "../hooks/useTaxFilingDetailQuery";
import {
  useRecalculateFilingMutation,
  useSubmitFilingMutation,
  useMarkPaidFilingMutation,
  useDeleteFilingMutation,
} from "../hooks/useTaxFilingMutations";

export const FilingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading, isError } = useTaxFilingDetailQuery(id);
  const filing = data?.filing;

  const [activeStep, setActiveStep] = React.useState<FilingStepKey>("review");
  const [presetSourceType, setPresetSourceType] = React.useState<
    TaxFilingItemSourceType | undefined
  >(undefined);
  const includedItemsRef = React.useRef<HTMLDivElement | null>(null);

  const recalcMutation = useRecalculateFilingMutation(id);
  const submitMutation = useSubmitFilingMutation(id);
  const markPaidMutation = useMarkPaidFilingMutation(id);
  const deleteMutation = useDeleteFilingMutation(id);

  React.useEffect(() => {
    if (!filing) {
      return;
    }
    if (filing.status === "submitted") {
      setActiveStep("submit");
    } else if (filing.status === "paid") {
      setActiveStep("pay");
    } else {
      setActiveStep("review");
    }
  }, [filing?.status]);

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
      await recalcMutation.mutateAsync();
      toast.success("Recalculation queued");
      return;
    }
    if (actionKey === "exportPdf") {
      try {
        const result = await taxApi.getReportPdfUrl(id);
        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        console.error(error);
        toast.error("Failed to export PDF");
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
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete filing");
      }
    }
  };

  const handlePresetFilter = (sourceType: TaxFilingItemSourceType) => {
    setPresetSourceType(sourceType);
    includedItemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/tax/filings")}>
          Back to filings
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Filing not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const backTo = (location.state as { from?: string } | undefined)?.from ?? "/tax/filings";
  const hasBlockers = filing.issues.some((issue) => issue.severity === "blocker");

  const steps = [
    { key: "review" as const, label: "Review" },
    { key: "submit" as const, label: "Submit", disabled: hasBlockers },
    ...(filing.capabilities.paymentsEnabled ? [{ key: "pay" as const, label: "Pay" }] : []),
  ];

  const reviewContent =
    filing.type === "income-annual" ? (
      <ReviewStepIncomeAnnual
        totals={filing.totals}
        issues={filing.issues}
        currency={filing.totals?.currency}
        onRecalculate={() => recalcMutation.mutate()}
        onPresetFilter={handlePresetFilter}
        isRecalculating={recalcMutation.isPending}
      />
    ) : (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Review content for this filing type is coming soon.
        </CardContent>
      </Card>
    );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <FilingDetailHeader
        filing={filing}
        onBack={() => navigate(backTo)}
        onAction={handleHeaderAction}
        isLoading={recalcMutation.isPending || submitMutation.isPending}
      />

      <div className="flex flex-col gap-4">
        <FilingStepper steps={steps} activeStep={activeStep} onStepChange={setActiveStep} />
        {activeStep === "review" ? reviewContent : null}
        {activeStep === "submit" ? (
          <SubmitStep
            canSubmit={filing.capabilities.canSubmit && !hasBlockers}
            blockerMessage={hasBlockers ? "Resolve blocker issues before submitting." : undefined}
            isSubmitting={submitMutation.isPending}
            onSubmit={(payload) =>
              submitMutation.mutate(payload, {
                onSuccess: () => toast.success("Filing submitted"),
                onError: () => toast.error("Failed to submit filing"),
              })
            }
          />
        ) : null}
        {activeStep === "pay" && filing.capabilities.paymentsEnabled ? (
          <PayStep
            onMarkPaid={(payload) =>
              markPaidMutation.mutate(payload, {
                onSuccess: () => toast.success("Marked as paid"),
                onError: () => toast.error("Failed to mark paid"),
              })
            }
            isSubmitting={markPaidMutation.isPending}
            defaultAmountCents={filing.totals?.estimatedTaxDueCents ?? null}
          />
        ) : null}
      </div>

      <div ref={includedItemsRef} className="space-y-6">
        <IncludedItemsSection filingId={filing.id} presetSourceType={presetSourceType} />
        <AttachmentsSection filingId={filing.id} />
        <ActivitySection filingId={filing.id} />
      </div>
    </div>
  );
};
