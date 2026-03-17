import React from "react";
import {
  createDefaultAdditionalExpensesSectionPayload,
  createDefaultChildrenSectionPayload,
  createDefaultHealthInsuranceSectionPayload,
  createDefaultIncomeSectionPayload,
  createDefaultOtherInsurancesSectionPayload,
  createDefaultPayslipsSectionPayload,
  createDefaultPersonalDetailsSectionPayload,
  createDefaultTaxOfficeInfoSectionPayload,
} from "@corely/contracts";
import { Button, Card, CardContent, cn } from "@corely/ui";
import type { WizardStepKey } from "./income-tax-return-shared";
import { StepCircle, TAX_WIZARD_STEPS } from "./income-tax-return-shared";
import { IncomeTaxReturnIncomeStep } from "./income-tax-return-income-step";
import { IncomeTaxReturnPersonalDetailsStep } from "./income-tax-return-personal-details-step";
import { IncomeTaxReturnHealthInsuranceStep } from "./income-tax-return-health-insurance-step";
import { IncomeTaxReturnOtherInsurancesStep } from "./income-tax-return-other-insurances-step";
import { IncomeTaxReturnAdditionalExpensesStep } from "./income-tax-return-additional-expenses-step";
import { IncomeTaxReturnInfoForTaxOfficeStep } from "./income-tax-return-info-for-tax-office-step";
import { useTaxReportSection } from "../hooks/useTaxReportSection";

type IncomeTaxReturnPageProps = {
  filingId: string;
  reportId: string;
};

const StepPlaceholder = ({ label }: { label?: string }) => (
  <Card>
    <CardContent className="space-y-3 p-6">
      <h2 className="text-h3 text-foreground">{label}</h2>
      <p className="text-body-sm text-muted-foreground">
        This section is coming next. Use the Income, Personal details, or Health insurance steps to
        preview the implemented UI.
      </p>
    </CardContent>
  </Card>
);

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const computeEstimatedTax = (
  payload: ReturnType<typeof createDefaultIncomeSectionPayload>["annualIncome"]
): number => {
  const totals = payload.incomeSources.reduce(
    (acc, source) => {
      acc.grossIncome += source.amounts.grossIncome;
      acc.socialContributions += source.amounts.socialContributions ?? 0;
      acc.expensesRelated += source.amounts.expensesRelated ?? 0;
      return acc;
    },
    {
      grossIncome: 0,
      socialContributions: 0,
      expensesRelated: 0,
    }
  );

  const taxableIncome = Math.max(
    0,
    totals.grossIncome - totals.expensesRelated - totals.socialContributions
  );
  return taxableIncome * 0.2;
};

export const IncomeTaxReturnPage = ({ filingId, reportId }: IncomeTaxReturnPageProps) => {
  const [activeStep, setActiveStep] = React.useState<WizardStepKey>("income");
  const personalDetailsSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "personalDetails",
    defaultValue: React.useMemo(() => createDefaultPersonalDetailsSectionPayload(), []),
  });
  const incomeSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "income",
    defaultValue: React.useMemo(() => createDefaultIncomeSectionPayload(), []),
  });
  const healthInsuranceSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "healthInsurance",
    defaultValue: React.useMemo(() => createDefaultHealthInsuranceSectionPayload(), []),
  });
  const otherInsurancesSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "otherInsurances",
    defaultValue: React.useMemo(() => createDefaultOtherInsurancesSectionPayload(), []),
  });
  const additionalExpensesSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "additionalExpenses",
    defaultValue: React.useMemo(() => createDefaultAdditionalExpensesSectionPayload(), []),
  });
  const taxOfficeInfoSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "taxOfficeInfo",
    defaultValue: React.useMemo(() => createDefaultTaxOfficeInfoSectionPayload(), []),
  });
  const payslipsSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "payslips",
    defaultValue: React.useMemo(() => createDefaultPayslipsSectionPayload(), []),
  });
  const childrenSection = useTaxReportSection({
    filingId,
    reportId,
    sectionKey: "children",
    defaultValue: React.useMemo(() => createDefaultChildrenSectionPayload(), []),
  });

  const getSectionStateForStep = (
    step: Exclude<WizardStepKey, "paid-add-ons" | "review-and-submit">
  ) => {
    switch (step) {
      case "personal-details":
        return personalDetailsSection;
      case "income":
        return incomeSection;
      case "health-insurance":
        return healthInsuranceSection;
      case "other-insurances":
        return otherInsurancesSection;
      case "additional-expenses":
        return additionalExpensesSection;
      case "info-for-tax-office":
        return taxOfficeInfoSection;
    }
  };

  const activeStepConfig = TAX_WIZARD_STEPS.find((step) => step.key === activeStep);
  const activeSectionState =
    activeStep === "paid-add-ons" || activeStep === "review-and-submit"
      ? null
      : getSectionStateForStep(activeStep);
  const latestReport = activeSectionState?.report;

  const steps = React.useMemo(
    () =>
      TAX_WIZARD_STEPS.map((step) =>
        step.key === "paid-add-ons" || step.key === "review-and-submit"
          ? step
          : {
              ...step,
              done: getSectionStateForStep(step.key).section?.isComplete ?? false,
            }
      ),
    [
      additionalExpensesSection,
      healthInsuranceSection,
      incomeSection,
      otherInsurancesSection,
      personalDetailsSection,
      taxOfficeInfoSection,
    ]
  );

  const saveState = activeSectionState?.saveState ?? "saved";
  const estimatedTax = computeEstimatedTax(incomeSection.value.annualIncome);

  const saveLabel =
    saveState === "loading"
      ? "Loading…"
      : saveState === "saving"
        ? "Saving…"
        : saveState === "error"
          ? "Retry"
          : "All changes saved";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="border-b border-border pb-4">
          <h1 className="text-h1 text-foreground">Income tax return</h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,25%)_1fr]">
          <aside className="order-2 space-y-6 lg:order-1 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wider",
                      saveState === "error"
                        ? "bg-rose-100 text-rose-700"
                        : saveState === "saving" || saveState === "loading"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-600 text-white"
                    )}
                  >
                    {saveLabel.toUpperCase()}
                  </span>
                  {saveState === "error" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activeSectionState?.retrySave()}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>

                <ul className="space-y-2" aria-label="Tax return steps">
                  {steps.map((step) => (
                    <li key={step.step} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveStep(step.key)}
                        className={cn(
                          "flex items-center gap-3 text-left transition-colors",
                          activeStep === step.key ? "font-bold text-foreground" : "text-foreground"
                        )}
                        aria-current={activeStep === step.key ? "step" : undefined}
                      >
                        <StepCircle
                          done={Boolean(step.done)}
                          step={step.step}
                          active={activeStep === step.key}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            activeStep === step.key ? "font-bold" : "font-medium"
                          )}
                        >
                          {step.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated income tax</p>
                  <p className="text-h2 text-foreground">{formatCurrency(estimatedTax)}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Report status: {latestReport?.status ?? "draft"}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="order-1 space-y-6 lg:order-2">
            {activeSectionState?.isError && !activeSectionState.isInitialized ? (
              <Card>
                <CardContent className="space-y-3 p-6">
                  <p className="text-sm text-rose-600">Failed to load this section.</p>
                  <Button variant="outline" onClick={() => activeSectionState.refetch()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {activeStep === "income" ? (
              <IncomeTaxReturnIncomeStep
                filingId={filingId}
                reportId={reportId}
                value={incomeSection.value}
                onChange={incomeSection.setValue}
                payslipEntries={payslipsSection.value.entries}
                disabled={incomeSection.isLoading}
              />
            ) : null}
            {activeStep === "personal-details" ? (
              <IncomeTaxReturnPersonalDetailsStep
                value={personalDetailsSection.value}
                onChange={personalDetailsSection.setValue}
              />
            ) : null}
            {activeStep === "health-insurance" ? (
              <IncomeTaxReturnHealthInsuranceStep
                value={healthInsuranceSection.value}
                onChange={healthInsuranceSection.setValue}
              />
            ) : null}
            {activeStep === "other-insurances" ? (
              <IncomeTaxReturnOtherInsurancesStep
                value={otherInsurancesSection.value}
                onChange={otherInsurancesSection.setValue}
                onNext={() => setActiveStep("additional-expenses")}
              />
            ) : null}
            {activeStep === "additional-expenses" ? (
              <IncomeTaxReturnAdditionalExpensesStep
                value={additionalExpensesSection.value}
                onChange={additionalExpensesSection.setValue}
                childrenEntries={childrenSection.value.entries}
                onNext={() => setActiveStep("info-for-tax-office")}
              />
            ) : null}
            {activeStep === "info-for-tax-office" ? (
              <IncomeTaxReturnInfoForTaxOfficeStep
                value={taxOfficeInfoSection.value}
                onChange={taxOfficeInfoSection.setValue}
                onNext={() => setActiveStep("paid-add-ons")}
              />
            ) : null}
            {activeStep !== "income" &&
            activeStep !== "personal-details" &&
            activeStep !== "health-insurance" &&
            activeStep !== "other-insurances" &&
            activeStep !== "additional-expenses" &&
            activeStep !== "info-for-tax-office" ? (
              <StepPlaceholder label={activeStepConfig?.label} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default IncomeTaxReturnPage;
