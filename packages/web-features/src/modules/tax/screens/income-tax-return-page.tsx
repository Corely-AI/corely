import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnnualIncomeSectionPayload,
  TaxReportSectionValidationError,
} from "@corely/contracts";
import { Button, Card, CardContent, cn } from "@corely/ui";
import { taxReportApi } from "@corely/web-shared/lib/tax-report-api";
import type { WizardStepKey } from "./income-tax-return-shared";
import { StepCircle, TAX_WIZARD_STEPS } from "./income-tax-return-shared";
import { IncomeTaxReturnIncomeStep } from "./income-tax-return-income-step";
import { IncomeTaxReturnPersonalDetailsStep } from "./income-tax-return-personal-details-step";
import { IncomeTaxReturnHealthInsuranceStep } from "./income-tax-return-health-insurance-step";
import { taxAnnualIncomeSectionQueryKey } from "../queries";

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

const DEFAULT_ANNUAL_INCOME: AnnualIncomeSectionPayload = {
  incomeSources: [],
  noIncomeFlag: false,
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const computeEstimatedTax = (payload: AnnualIncomeSectionPayload): number => {
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
  const queryClient = useQueryClient();
  const queryKey = taxAnnualIncomeSectionQueryKey(filingId, reportId);

  const [activeStep, setActiveStep] = React.useState<WizardStepKey>("income");
  const [annualIncome, setAnnualIncome] =
    React.useState<AnnualIncomeSectionPayload>(DEFAULT_ANNUAL_INCOME);
  const [lastSavedSnapshot, setLastSavedSnapshot] = React.useState<string>("");
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<TaxReportSectionValidationError[]>(
    []
  );

  const sectionQuery = useQuery({
    queryKey,
    queryFn: () => taxReportApi.getAnnualIncomeSection(filingId, reportId),
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: AnnualIncomeSectionPayload) =>
      taxReportApi.upsertAnnualIncomeSection(filingId, reportId, {
        payload,
      }),
    onSuccess: (result) => {
      setValidationErrors(result.section.validationErrors);
      const snapshot = JSON.stringify(result.section.payload.annualIncome);
      setLastSavedSnapshot(snapshot);
      queryClient.setQueryData(queryKey, result);
    },
  });

  React.useEffect(() => {
    if (!sectionQuery.data) {
      return;
    }

    const payload = sectionQuery.data.section.payload.annualIncome;
    const snapshot = JSON.stringify(payload);

    if (!isInitialized) {
      setAnnualIncome(payload);
      setLastSavedSnapshot(snapshot);
      setValidationErrors(sectionQuery.data.section.validationErrors);
      setIsInitialized(true);
      return;
    }

    if (snapshot === lastSavedSnapshot) {
      setValidationErrors(sectionQuery.data.section.validationErrors);
    }
  }, [isInitialized, lastSavedSnapshot, sectionQuery.data]);

  const snapshot = React.useMemo(() => JSON.stringify(annualIncome), [annualIncome]);
  const isDirty = isInitialized && snapshot !== lastSavedSnapshot;

  React.useEffect(() => {
    if (!isInitialized || !isDirty || upsertMutation.isPending) {
      return;
    }

    const timer = window.setTimeout(() => {
      upsertMutation.mutate(annualIncome);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [annualIncome, isDirty, isInitialized, upsertMutation]);

  const activeStepConfig = TAX_WIZARD_STEPS.find((step) => step.key === activeStep);
  const latestSection = upsertMutation.data?.section ?? sectionQuery.data?.section;
  const latestReport = upsertMutation.data?.report ?? sectionQuery.data?.report;

  const steps = React.useMemo(
    () =>
      TAX_WIZARD_STEPS.map((step) =>
        step.key === "income"
          ? {
              ...step,
              done: latestSection?.isComplete ?? false,
            }
          : step
      ),
    [latestSection?.isComplete]
  );

  const saveState =
    sectionQuery.isLoading && !isInitialized
      ? "loading"
      : upsertMutation.isError
        ? "error"
        : upsertMutation.isPending || isDirty
          ? "saving"
          : "saved";

  const estimatedTax = computeEstimatedTax(annualIncome);

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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,35%)_minmax(0,65%)]">
          <aside className="space-y-6">
            <Card>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-3 py-1.5 text-xs font-semibold",
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
                      onClick={() => upsertMutation.mutate(annualIncome)}
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>

                <ul className="space-y-3.5" aria-label="Tax return steps">
                  {steps.map((step) => (
                    <li key={step.step} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveStep(step.key)}
                        className="flex items-center gap-3 text-left"
                      >
                        <StepCircle
                          done={Boolean(step.done)}
                          step={step.step}
                          active={activeStep === step.key}
                        />
                        <span
                          className={cn(
                            "text-body text-foreground",
                            activeStep === step.key ? "font-semibold" : "font-medium"
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
              <CardContent className="space-y-3 p-6">
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

          <section className="space-y-6">
            {sectionQuery.isError && !isInitialized ? (
              <Card>
                <CardContent className="space-y-3 p-6">
                  <p className="text-sm text-rose-600">Failed to load annual income section.</p>
                  <Button variant="outline" onClick={() => sectionQuery.refetch()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {activeStep === "income" ? (
              <IncomeTaxReturnIncomeStep
                value={annualIncome}
                validationErrors={validationErrors}
                onChange={setAnnualIncome}
                disabled={sectionQuery.isLoading && !isInitialized}
              />
            ) : null}
            {activeStep === "personal-details" ? <IncomeTaxReturnPersonalDetailsStep /> : null}
            {activeStep === "health-insurance" ? <IncomeTaxReturnHealthInsuranceStep /> : null}
            {activeStep !== "income" &&
            activeStep !== "personal-details" &&
            activeStep !== "health-insurance" ? (
              <StepPlaceholder label={activeStepConfig?.label} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default IncomeTaxReturnPage;
