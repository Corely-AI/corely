import React from "react";
import type { BinaryChoice, OtherInsurancesSectionPayload } from "@corely/contracts";
import { AlertCircle } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { RequiredHint, SegmentedControl } from "./income-tax-return-shared";

type IncomeTaxReturnOtherInsurancesStepProps = {
  value: OtherInsurancesSectionPayload;
  onChange: (next: OtherInsurancesSectionPayload) => void;
  onNext?: () => void;
};

type MoneyFieldProps = {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
};

const MoneyField = ({ id, label, value, onChange, required = false }: MoneyFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-foreground">
      {label}
    </Label>
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10"
    />
    <RequiredHint show={required && value.trim().length === 0} />
  </div>
);

export const IncomeTaxReturnOtherInsurancesStep = ({
  value,
  onChange,
  onNext,
}: IncomeTaxReturnOtherInsurancesStepProps) => {
  const taxYear = new Date().getFullYear() - 1;
  const payslipHref = `/income-statement/payslip/${taxYear}/main-partner`;
  const spousePayslipHref = `/income-statement/payslip/${taxYear}/spouse`;
  const update = (patch: Partial<OtherInsurancesSectionPayload>) =>
    onChange({ ...value, ...patch });

  const hasPensionFund = value.hasPensionFund as BinaryChoice;
  const pensionEmployeeContribution = value.pensionEmployeeContribution;
  const pensionSelfEmployedContribution = value.pensionSelfEmployedContribution;
  const basicPensionCosts = value.basicPensionCosts;
  const spouseHasPensionFund = value.spouseHasPensionFund as BinaryChoice;
  const spousePensionEmployeeContribution = value.spousePensionEmployeeContribution;
  const spouseBasicPensionCosts = value.spouseBasicPensionCosts;
  const hasAccidentLifeInsurance = value.hasAccidentLifeInsurance as BinaryChoice;
  const accidentLifeInsuranceCosts = value.accidentLifeInsuranceCosts;
  const spouseHasAccidentLifeInsurance = value.spouseHasAccidentLifeInsurance as BinaryChoice;
  const spouseAccidentLifeInsuranceCosts = value.spouseAccidentLifeInsuranceCosts;
  const hasUnemploymentInsurance = value.hasUnemploymentInsurance as BinaryChoice;
  const unemploymentEmployeeContribution = value.unemploymentEmployeeContribution;
  const unemploymentSelfEmployedContribution = value.unemploymentSelfEmployedContribution;
  const spouseHasUnemploymentInsurance = value.spouseHasUnemploymentInsurance;
  const spouseUnemploymentEmployeeContribution = value.spouseUnemploymentEmployeeContribution;
  const spouseUnemploymentSelfEmployedContribution =
    value.spouseUnemploymentSelfEmployedContribution;
  const hasWorkDisabilityInsurance = value.hasWorkDisabilityInsurance as BinaryChoice;
  const workDisabilityInsuranceCosts = value.workDisabilityInsuranceCosts;
  const spouseHasWorkDisabilityInsurance = value.spouseHasWorkDisabilityInsurance as BinaryChoice;
  const spouseWorkDisabilityInsuranceCosts = value.spouseWorkDisabilityInsuranceCosts;

  const setHasPensionFund = (next: BinaryChoice) => update({ hasPensionFund: next });
  const setPensionEmployeeContribution = (next: string) =>
    update({ pensionEmployeeContribution: next });
  const setPensionSelfEmployedContribution = (next: string) =>
    update({ pensionSelfEmployedContribution: next });
  const setBasicPensionCosts = (next: string) => update({ basicPensionCosts: next });
  const setSpouseHasPensionFund = (next: BinaryChoice) => update({ spouseHasPensionFund: next });
  const setSpousePensionEmployeeContribution = (next: string) =>
    update({ spousePensionEmployeeContribution: next });
  const setSpouseBasicPensionCosts = (next: string) => update({ spouseBasicPensionCosts: next });
  const setHasAccidentLifeInsurance = (next: BinaryChoice) =>
    update({ hasAccidentLifeInsurance: next });
  const setAccidentLifeInsuranceCosts = (next: string) =>
    update({ accidentLifeInsuranceCosts: next });
  const setSpouseHasAccidentLifeInsurance = (next: BinaryChoice) =>
    update({ spouseHasAccidentLifeInsurance: next });
  const setSpouseAccidentLifeInsuranceCosts = (next: string) =>
    update({ spouseAccidentLifeInsuranceCosts: next });
  const setHasUnemploymentInsurance = (next: BinaryChoice) =>
    update({ hasUnemploymentInsurance: next });
  const setUnemploymentEmployeeContribution = (next: string) =>
    update({ unemploymentEmployeeContribution: next });
  const setUnemploymentSelfEmployedContribution = (next: string) =>
    update({ unemploymentSelfEmployedContribution: next });
  const setSpouseHasUnemploymentInsurance = (next: BinaryChoice) =>
    update({ spouseHasUnemploymentInsurance: next });
  const setSpouseUnemploymentEmployeeContribution = (next: string) =>
    update({ spouseUnemploymentEmployeeContribution: next });
  const setSpouseUnemploymentSelfEmployedContribution = (next: string) =>
    update({ spouseUnemploymentSelfEmployedContribution: next });
  const setHasWorkDisabilityInsurance = (next: BinaryChoice) =>
    update({ hasWorkDisabilityInsurance: next });
  const setWorkDisabilityInsuranceCosts = (next: string) =>
    update({ workDisabilityInsuranceCosts: next });
  const setSpouseHasWorkDisabilityInsurance = (next: BinaryChoice) =>
    update({ spouseHasWorkDisabilityInsurance: next });
  const setSpouseWorkDisabilityInsuranceCosts = (next: string) =>
    update({ spouseWorkDisabilityInsuranceCosts: next });

  const hasMissingRequiredDetails =
    (hasAccidentLifeInsurance === "yes" && accidentLifeInsuranceCosts.trim().length === 0) ||
    (spouseHasAccidentLifeInsurance === "yes" &&
      spouseAccidentLifeInsuranceCosts.trim().length === 0) ||
    spouseHasUnemploymentInsurance === "" ||
    (hasWorkDisabilityInsurance === "yes" && workDisabilityInsuranceCosts.trim().length === 0) ||
    (spouseHasWorkDisabilityInsurance === "yes" &&
      spouseWorkDisabilityInsuranceCosts.trim().length === 0);

  return (
    <div className="space-y-6">
      {hasMissingRequiredDetails ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>Required details are missing on this page</p>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">Pension</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you have a pension fund?
              </Label>
              <SegmentedControl
                ariaLabel="Pension fund"
                value={hasPensionFund}
                onChange={(next) => setHasPensionFund(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasPensionFund === "yes" ? (
              <div className="space-y-4">
                <MoneyField
                  id="pension-employee-contribution"
                  label={
                    <>
                      Contributions to pension as an employee declared on your{" "}
                      <a
                        href={payslipHref}
                        className="text-sky-500 transition-colors hover:text-sky-400"
                      >
                        annual payslips
                      </a>
                    </>
                  }
                  value={pensionEmployeeContribution}
                  onChange={setPensionEmployeeContribution}
                />
                <MoneyField
                  id="pension-self-employed-contribution"
                  label="Contributions to public pension insurance as a self employed (Optional)"
                  value={pensionSelfEmployedContribution}
                  onChange={setPensionSelfEmployedContribution}
                />
                <MoneyField
                  id="basic-pension-costs"
                  label="Basic pension costs (Rürup-Contracts) (Optional)"
                  value={basicPensionCosts}
                  onChange={setBasicPensionCosts}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Does your spouse have a pension fund?
              </Label>
              <SegmentedControl
                ariaLabel="Spouse pension fund"
                value={spouseHasPensionFund}
                onChange={(next) => setSpouseHasPensionFund(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {spouseHasPensionFund === "yes" ? (
              <div className="space-y-4">
                <MoneyField
                  id="spouse-pension-employee-contribution"
                  label={
                    <>
                      Contributions to pension as an employee declared on your spouse{" "}
                      <a
                        href={spousePayslipHref}
                        className="text-sky-500 transition-colors hover:text-sky-400"
                      >
                        annual payslips
                      </a>
                    </>
                  }
                  value={spousePensionEmployeeContribution}
                  onChange={setSpousePensionEmployeeContribution}
                />
                <MoneyField
                  id="spouse-basic-pension-costs"
                  label="Basic pension costs (Rürup-Contracts) (Optional)"
                  value={spouseBasicPensionCosts}
                  onChange={setSpouseBasicPensionCosts}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">
              Accident, liability and life insurance costs
            </h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you have accident, liability or life insurances that are only applicable in case
                of death?
              </Label>
              <SegmentedControl
                ariaLabel="Accident liability life insurance"
                value={hasAccidentLifeInsurance}
                onChange={(next) => setHasAccidentLifeInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasAccidentLifeInsurance === "yes" ? (
              <MoneyField
                id="accident-life-insurance-costs"
                label="Accident, liability and risk insurance costs"
                value={accidentLifeInsuranceCosts}
                onChange={setAccidentLifeInsuranceCosts}
                required
              />
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Does your spouse have accident, liability or life insurances that are only
                applicable in case of death?
              </Label>
              <SegmentedControl
                ariaLabel="Spouse accident liability life insurance"
                value={spouseHasAccidentLifeInsurance}
                onChange={(next) => setSpouseHasAccidentLifeInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {spouseHasAccidentLifeInsurance === "yes" ? (
              <MoneyField
                id="spouse-accident-life-insurance-costs"
                label="Accident, liability and risk insurance costs"
                value={spouseAccidentLifeInsuranceCosts}
                onChange={setSpouseAccidentLifeInsuranceCosts}
                required
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">Unemployment insurance</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you have an unemployment insurance?
              </Label>
              <SegmentedControl
                ariaLabel="Unemployment insurance"
                value={hasUnemploymentInsurance}
                onChange={(next) => setHasUnemploymentInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasUnemploymentInsurance === "yes" ? (
              <div className="space-y-4">
                <MoneyField
                  id="unemployment-employee-contribution"
                  label={
                    <>
                      Contributions to unemployment insurance as an employee declared on your{" "}
                      <a
                        href={payslipHref}
                        className="text-sky-500 transition-colors hover:text-sky-400"
                      >
                        annual payslips
                      </a>
                    </>
                  }
                  value={unemploymentEmployeeContribution}
                  onChange={setUnemploymentEmployeeContribution}
                />
                <MoneyField
                  id="unemployment-self-employed-contribution"
                  label="Contributions to unemployment insurance as a self employed (Optional)"
                  value={unemploymentSelfEmployedContribution}
                  onChange={setUnemploymentSelfEmployedContribution}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Does your spouse have an unemployment insurance?
              </Label>
              <SegmentedControl
                ariaLabel="Spouse unemployment insurance"
                value={spouseHasUnemploymentInsurance}
                onChange={(next) => setSpouseHasUnemploymentInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
              <RequiredHint show={spouseHasUnemploymentInsurance === ""} />
            </div>

            {spouseHasUnemploymentInsurance === "yes" ? (
              <div className="space-y-4">
                <MoneyField
                  id="spouse-unemployment-employee-contribution"
                  label={
                    <>
                      Contributions to unemployment insurance as an employee declared on your spouse{" "}
                      <a
                        href={spousePayslipHref}
                        className="text-sky-500 transition-colors hover:text-sky-400"
                      >
                        annual payslips
                      </a>
                    </>
                  }
                  value={spouseUnemploymentEmployeeContribution}
                  onChange={setSpouseUnemploymentEmployeeContribution}
                />
                <MoneyField
                  id="spouse-unemployment-self-employed-contribution"
                  label="Contributions to unemployment insurance as a self employed (Optional)"
                  value={spouseUnemploymentSelfEmployedContribution}
                  onChange={setSpouseUnemploymentSelfEmployedContribution}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">Work and disability insurances</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you have a voluntary work and disability insurance?
              </Label>
              <SegmentedControl
                ariaLabel="Work and disability insurance"
                value={hasWorkDisabilityInsurance}
                onChange={(next) => setHasWorkDisabilityInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasWorkDisabilityInsurance === "yes" ? (
              <MoneyField
                id="work-disability-insurance-costs"
                label="Work and disability insurance costs"
                value={workDisabilityInsuranceCosts}
                onChange={setWorkDisabilityInsuranceCosts}
                required
              />
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Does your spouse have a voluntary work and disability insurance?
              </Label>
              <SegmentedControl
                ariaLabel="Spouse work and disability insurance"
                value={spouseHasWorkDisabilityInsurance}
                onChange={(next) => setSpouseHasWorkDisabilityInsurance(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {spouseHasWorkDisabilityInsurance === "yes" ? (
              <MoneyField
                id="spouse-work-disability-insurance-costs"
                label="Work and disability insurance costs"
                value={spouseWorkDisabilityInsuranceCosts}
                onChange={setSpouseWorkDisabilityInsuranceCosts}
                required
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {onNext ? (
        <div className="flex justify-end">
          <Button type="button" onClick={onNext} className="rounded-full px-8">
            Next: Additional expenses
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default IncomeTaxReturnOtherInsurancesStep;
