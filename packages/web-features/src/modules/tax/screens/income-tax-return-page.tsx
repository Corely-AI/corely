import React from "react";
import { Button, Card, CardContent, cn } from "@corely/ui";
import type { WizardStepKey } from "./income-tax-return-shared";
import { StepCircle, TAX_WIZARD_STEPS } from "./income-tax-return-shared";
import { IncomeTaxReturnIncomeStep } from "./income-tax-return-income-step";
import { IncomeTaxReturnPersonalDetailsStep } from "./income-tax-return-personal-details-step";
import { IncomeTaxReturnHealthInsuranceStep } from "./income-tax-return-health-insurance-step";

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

export const IncomeTaxReturnPage = () => {
  const [activeStep, setActiveStep] = React.useState<WizardStepKey>("personal-details");
  const activeStepConfig = TAX_WIZARD_STEPS.find((step) => step.key === activeStep);

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
                <span className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  ALL CHANGES SAVED
                </span>

                <ul className="space-y-3.5" aria-label="Tax return steps">
                  {TAX_WIZARD_STEPS.map((step) => (
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
                  <p className="text-h2 text-foreground">€5,621.00</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 text-sm font-medium text-sky-600 hover:bg-transparent hover:text-sky-700"
                >
                  How is it estimated?
                </Button>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            {activeStep === "income" ? <IncomeTaxReturnIncomeStep /> : null}
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
