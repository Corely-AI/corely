import type { TaxFilingDetail } from "@corely/contracts";
import type { FilingStep, FilingStepKey } from "../components/filing-stepper";
import type { TaxMode } from "../hooks/useTaxMode";

type BuildFilingFlowInput = {
  mode: TaxMode;
  filing: TaxFilingDetail;
  hasBlockers: boolean;
};

const STEP_ORDER: FilingStepKey[] = ["review", "submit", "pay"];

export function getDefaultStep(filing: TaxFilingDetail): FilingStepKey {
  if (filing.status === "paid") {
    return "pay";
  }
  if (filing.status === "submitted") {
    return filing.capabilities.paymentsEnabled ? "pay" : "submit";
  }
  return "review";
}

export function buildFilingFlow({ mode, filing, hasBlockers }: BuildFilingFlowInput): FilingStep[] {
  const freelancerSteps: FilingStep[] = [
    { key: "review", label: "Review" },
    { key: "submit", label: "Submit", disabled: hasBlockers || !filing.capabilities.canSubmit },
    ...(filing.capabilities.paymentsEnabled
      ? [
          {
            key: "pay" as const,
            label: "Pay",
            disabled: !filing.capabilities.canMarkPaid && filing.status !== "paid",
          },
        ]
      : []),
  ];

  // Company mode reuses the freelancer baseline and can append/replace steps later.
  const configuredSteps = mode === "COMPANY" ? freelancerSteps : freelancerSteps;
  const completedUntil = resolveCompletedStepIndex(filing.status);

  return configuredSteps.map((step) => ({
    ...step,
    completed: STEP_ORDER.indexOf(step.key) <= completedUntil,
  }));
}

function resolveCompletedStepIndex(status: TaxFilingDetail["status"]): number {
  if (status === "paid") {
    return STEP_ORDER.indexOf("pay");
  }
  if (status === "submitted") {
    return STEP_ORDER.indexOf("submit");
  }
  if (status === "readyForReview") {
    return STEP_ORDER.indexOf("review");
  }
  return -1;
}
