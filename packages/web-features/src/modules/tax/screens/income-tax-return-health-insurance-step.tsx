import React from "react";
import type { BinaryChoice, HealthInsuranceSectionPayload } from "@corely/contracts";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, Input, Label } from "@corely/ui";
import { OptionalMoneyField, RequiredHint, SegmentedControl } from "./income-tax-return-shared";

type IncomeTaxReturnHealthInsuranceStepProps = {
  value: HealthInsuranceSectionPayload;
  onChange: (next: HealthInsuranceSectionPayload) => void;
};

export const IncomeTaxReturnHealthInsuranceStep = ({
  value,
  onChange,
}: IncomeTaxReturnHealthInsuranceStepProps) => {
  const update = (patch: Partial<HealthInsuranceSectionPayload>) =>
    onChange({ ...value, ...patch });
  const hasStatutoryHealthInsurance = value.hasStatutoryHealthInsurance as BinaryChoice;
  const employeeHealthInsuranceContribution = value.employeeHealthInsuranceContribution;
  const statutoryContributionSelfEmployed = value.statutoryContributionSelfEmployed;
  const employeeNursingInsuranceContribution = value.employeeNursingInsuranceContribution;
  const contributionWithSickBenefit = value.contributionWithSickBenefit;
  const nursingContributionSelfEmployed = value.nursingContributionSelfEmployed;
  const refundedContribution = value.refundedContribution;
  const refundedContributionWithSickBenefit = value.refundedContributionWithSickBenefit;
  const voluntaryContributionSubsidy = value.voluntaryContributionSubsidy;
  const additionalContribution = value.additionalContribution;
  const spouseHasStatutoryHealthInsurance = value.spouseHasStatutoryHealthInsurance;
  const spouseEmployeeHealthInsuranceContribution = value.spouseEmployeeHealthInsuranceContribution;
  const spouseStatutoryContributionSelfEmployed = value.spouseStatutoryContributionSelfEmployed;
  const spouseEmployeeNursingInsuranceContribution =
    value.spouseEmployeeNursingInsuranceContribution;
  const spouseContributionWithSickBenefit = value.spouseContributionWithSickBenefit;
  const spouseNursingContributionSelfEmployed = value.spouseNursingContributionSelfEmployed;
  const spouseRefundedContribution = value.spouseRefundedContribution;
  const spouseRefundedContributionWithSickBenefit = value.spouseRefundedContributionWithSickBenefit;
  const spouseVoluntaryContributionSubsidy = value.spouseVoluntaryContributionSubsidy;
  const spouseAdditionalContribution = value.spouseAdditionalContribution;
  const hasPrivateHealthInsurance = value.hasPrivateHealthInsurance as BinaryChoice;
  const privateBasicCoverageContribution = value.privateBasicCoverageContribution;
  const privateMandatoryNursingContribution = value.privateMandatoryNursingContribution;
  const privateReimbursedContribution = value.privateReimbursedContribution;
  const privateThirdPartySubsidy = value.privateThirdPartySubsidy;
  const privateOptionalServicesContribution = value.privateOptionalServicesContribution;
  const spouseHasPrivateHealthInsurance = value.spouseHasPrivateHealthInsurance;
  const spousePrivateBasicCoverageContribution = value.spousePrivateBasicCoverageContribution;
  const spousePrivateMandatoryNursingContribution = value.spousePrivateMandatoryNursingContribution;
  const spousePrivateReimbursedContribution = value.spousePrivateReimbursedContribution;
  const spousePrivateThirdPartySubsidy = value.spousePrivateThirdPartySubsidy;
  const spousePrivateOptionalServicesContribution = value.spousePrivateOptionalServicesContribution;

  const setHasStatutoryHealthInsurance = (next: BinaryChoice) =>
    update({ hasStatutoryHealthInsurance: next });
  const setEmployeeHealthInsuranceContribution = (next: string) =>
    update({ employeeHealthInsuranceContribution: next });
  const setStatutoryContributionSelfEmployed = (next: string) =>
    update({ statutoryContributionSelfEmployed: next });
  const setEmployeeNursingInsuranceContribution = (next: string) =>
    update({ employeeNursingInsuranceContribution: next });
  const setContributionWithSickBenefit = (next: string) =>
    update({ contributionWithSickBenefit: next });
  const setNursingContributionSelfEmployed = (next: string) =>
    update({ nursingContributionSelfEmployed: next });
  const setRefundedContribution = (next: string) => update({ refundedContribution: next });
  const setRefundedContributionWithSickBenefit = (next: string) =>
    update({ refundedContributionWithSickBenefit: next });
  const setVoluntaryContributionSubsidy = (next: string) =>
    update({ voluntaryContributionSubsidy: next });
  const setAdditionalContribution = (next: string) => update({ additionalContribution: next });
  const setSpouseHasStatutoryHealthInsurance = (next: BinaryChoice) =>
    update({ spouseHasStatutoryHealthInsurance: next });
  const setSpouseEmployeeHealthInsuranceContribution = (next: string) =>
    update({ spouseEmployeeHealthInsuranceContribution: next });
  const setSpouseStatutoryContributionSelfEmployed = (next: string) =>
    update({ spouseStatutoryContributionSelfEmployed: next });
  const setSpouseEmployeeNursingInsuranceContribution = (next: string) =>
    update({ spouseEmployeeNursingInsuranceContribution: next });
  const setSpouseContributionWithSickBenefit = (next: string) =>
    update({ spouseContributionWithSickBenefit: next });
  const setSpouseNursingContributionSelfEmployed = (next: string) =>
    update({ spouseNursingContributionSelfEmployed: next });
  const setSpouseRefundedContribution = (next: string) =>
    update({ spouseRefundedContribution: next });
  const setSpouseRefundedContributionWithSickBenefit = (next: string) =>
    update({ spouseRefundedContributionWithSickBenefit: next });
  const setSpouseVoluntaryContributionSubsidy = (next: string) =>
    update({ spouseVoluntaryContributionSubsidy: next });
  const setSpouseAdditionalContribution = (next: string) =>
    update({ spouseAdditionalContribution: next });
  const setHasPrivateHealthInsurance = (next: BinaryChoice) =>
    update({ hasPrivateHealthInsurance: next });
  const setPrivateBasicCoverageContribution = (next: string) =>
    update({ privateBasicCoverageContribution: next });
  const setPrivateMandatoryNursingContribution = (next: string) =>
    update({ privateMandatoryNursingContribution: next });
  const setPrivateReimbursedContribution = (next: string) =>
    update({ privateReimbursedContribution: next });
  const setPrivateThirdPartySubsidy = (next: string) => update({ privateThirdPartySubsidy: next });
  const setPrivateOptionalServicesContribution = (next: string) =>
    update({ privateOptionalServicesContribution: next });
  const setSpouseHasPrivateHealthInsurance = (next: BinaryChoice) =>
    update({ spouseHasPrivateHealthInsurance: next });
  const setSpousePrivateBasicCoverageContribution = (next: string) =>
    update({ spousePrivateBasicCoverageContribution: next });
  const setSpousePrivateMandatoryNursingContribution = (next: string) =>
    update({ spousePrivateMandatoryNursingContribution: next });
  const setSpousePrivateReimbursedContribution = (next: string) =>
    update({ spousePrivateReimbursedContribution: next });
  const setSpousePrivateThirdPartySubsidy = (next: string) =>
    update({ spousePrivateThirdPartySubsidy: next });
  const setSpousePrivateOptionalServicesContribution = (next: string) =>
    update({ spousePrivateOptionalServicesContribution: next });

  const isSpouseStatutoryHealthInsuranceMissing = spouseHasStatutoryHealthInsurance === "";
  const isSpousePrivateHealthInsuranceMissing = spouseHasPrivateHealthInsurance === "";
  const hasHealthInsuranceMissingRequired =
    isSpouseStatutoryHealthInsuranceMissing || isSpousePrivateHealthInsuranceMissing;
  const taxYear = new Date().getFullYear() - 1;
  const payslipHref = `/income-statement/payslip/${taxYear}/main-partner`;
  const spousePayslipHref = `/income-statement/payslip/${taxYear}/spouse`;

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {hasHealthInsuranceMissingRequired ? (
          <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>Required details are missing on this page</p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <h2 className="text-h3 text-foreground">Statutory health insurance</h2>
            <p className="text-body-sm text-muted-foreground">
              Also known as a public health insurance
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Do you have a statutory health insurance?
            </Label>
            <SegmentedControl
              ariaLabel="Statutory health insurance"
              value={hasStatutoryHealthInsurance}
              onChange={(next) => setHasStatutoryHealthInsurance(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasStatutoryHealthInsurance === "yes" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="employee-health-insurance-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to health insurance as an employee declared on your{" "}
                  <a
                    href={payslipHref}
                    className="text-sky-500 transition-colors hover:text-sky-400"
                  >
                    annual payslips
                  </a>
                </Label>
                <Input
                  id="employee-health-insurance-contribution"
                  value={employeeHealthInsuranceContribution}
                  onChange={(event) => setEmployeeHealthInsuranceContribution(event.target.value)}
                  className="h-10"
                />
              </div>

              <OptionalMoneyField
                id="statutory-contribution-self-employed"
                label="Contributions to health insurance as a self employed (Optional)"
                helperText="Enter the amount that matches line 16 in your proof of health insurance"
                value={statutoryContributionSelfEmployed}
                onChange={setStatutoryContributionSelfEmployed}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="employee-nursing-insurance-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to nursing insurance as an employee declared on your{" "}
                  <a
                    href={payslipHref}
                    className="text-sky-500 transition-colors hover:text-sky-400"
                  >
                    annual payslips
                  </a>
                </Label>
                <Input
                  id="employee-nursing-insurance-contribution"
                  value={employeeNursingInsuranceContribution}
                  onChange={(event) => setEmployeeNursingInsuranceContribution(event.target.value)}
                  className="h-10"
                />
              </div>
              <OptionalMoneyField
                id="contribution-with-sick-benefit"
                label="Contributions with claims to sick benefit (Optional)"
                helperText="Enter the amount that matches line 17 in your proof of health insurance"
                value={contributionWithSickBenefit}
                onChange={setContributionWithSickBenefit}
              />
              <OptionalMoneyField
                id="nursing-contribution-self-employed"
                label="Contributions to nursing insurance as a self employed (Optional)"
                helperText="Enter the amount that matches line 18 in your proof of health insurance"
                value={nursingContributionSelfEmployed}
                onChange={setNursingContributionSelfEmployed}
              />
              <OptionalMoneyField
                id="refunded-contribution"
                label="Refunded contributions (Optional)"
                helperText="Enter the amount that matches line 19 in your proof of health insurance"
                value={refundedContribution}
                onChange={setRefundedContribution}
              />
              <OptionalMoneyField
                id="refunded-contribution-with-sick-benefit"
                label="Refunded contributions with claims to sick benefit (Optional)"
                helperText="Enter the amount that matches line 20 in your proof of health insurance"
                value={refundedContributionWithSickBenefit}
                onChange={setRefundedContributionWithSickBenefit}
              />
              <OptionalMoneyField
                id="voluntary-contribution-subsidy"
                label="Subsidy for the voluntary contributions to health and nursing insurance (Optional)"
                helperText="Enter the amount that matches line 21 in your proof of health insurance"
                value={voluntaryContributionSubsidy}
                onChange={setVoluntaryContributionSubsidy}
              />
              <OptionalMoneyField
                id="additional-contribution"
                label="Contributions as additional contribution (Optional)"
                helperText="Enter the amount that matches line 22 in your proof of health insurance"
                value={additionalContribution}
                onChange={setAdditionalContribution}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <h3 className="text-h3 text-foreground">Spouse statutory health insurance</h3>
            <p className="text-body-sm text-muted-foreground">
              Also known as a public health insurance
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Does your spouse have a statutory health insurance?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse statutory health insurance"
              value={spouseHasStatutoryHealthInsurance}
              onChange={(next) => setSpouseHasStatutoryHealthInsurance(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <RequiredHint show={isSpouseStatutoryHealthInsuranceMissing} />
          </div>

          {spouseHasStatutoryHealthInsurance === "yes" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="spouse-employee-health-insurance-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to health insurance as an employee declared on your{" "}
                  <a
                    href={spousePayslipHref}
                    className="text-sky-500 transition-colors hover:text-sky-400"
                  >
                    annual payslips
                  </a>
                </Label>
                <Input
                  id="spouse-employee-health-insurance-contribution"
                  value={spouseEmployeeHealthInsuranceContribution}
                  onChange={(event) =>
                    setSpouseEmployeeHealthInsuranceContribution(event.target.value)
                  }
                  className="h-10"
                />
              </div>

              <OptionalMoneyField
                id="spouse-statutory-contribution-self-employed"
                label="Contributions to health insurance as a self employed (Optional)"
                helperText="Enter the amount that matches line 16 in your proof of health insurance"
                value={spouseStatutoryContributionSelfEmployed}
                onChange={setSpouseStatutoryContributionSelfEmployed}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="spouse-employee-nursing-insurance-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to nursing insurance as an employee declared on your{" "}
                  <a
                    href={spousePayslipHref}
                    className="text-sky-500 transition-colors hover:text-sky-400"
                  >
                    annual payslips
                  </a>
                </Label>
                <Input
                  id="spouse-employee-nursing-insurance-contribution"
                  value={spouseEmployeeNursingInsuranceContribution}
                  onChange={(event) =>
                    setSpouseEmployeeNursingInsuranceContribution(event.target.value)
                  }
                  className="h-10"
                />
              </div>
              <OptionalMoneyField
                id="spouse-contribution-with-sick-benefit"
                label="Contributions with claims to sick benefit (Optional)"
                helperText="Enter the amount that matches line 17 in your proof of health insurance"
                value={spouseContributionWithSickBenefit}
                onChange={setSpouseContributionWithSickBenefit}
              />
              <OptionalMoneyField
                id="spouse-nursing-contribution-self-employed"
                label="Contributions to nursing insurance as a self employed (Optional)"
                helperText="Enter the amount that matches line 18 in your proof of health insurance"
                value={spouseNursingContributionSelfEmployed}
                onChange={setSpouseNursingContributionSelfEmployed}
              />
              <OptionalMoneyField
                id="spouse-refunded-contribution"
                label="Refunded contributions (Optional)"
                helperText="Enter the amount that matches line 19 in your proof of health insurance"
                value={spouseRefundedContribution}
                onChange={setSpouseRefundedContribution}
              />
              <OptionalMoneyField
                id="spouse-refunded-contribution-with-sick-benefit"
                label="Refunded contributions with claims to sick benefit (Optional)"
                helperText="Enter the amount that matches line 20 in your proof of health insurance"
                value={spouseRefundedContributionWithSickBenefit}
                onChange={setSpouseRefundedContributionWithSickBenefit}
              />
              <OptionalMoneyField
                id="spouse-voluntary-contribution-subsidy"
                label="Subsidy for the voluntary contributions to health and nursing insurance (Optional)"
                helperText="Enter the amount that matches line 21 in your proof of health insurance"
                value={spouseVoluntaryContributionSubsidy}
                onChange={setSpouseVoluntaryContributionSubsidy}
              />
              <OptionalMoneyField
                id="spouse-additional-contribution"
                label="Contributions as additional contribution (Optional)"
                helperText="Enter the amount that matches line 22 in your proof of health insurance"
                value={spouseAdditionalContribution}
                onChange={setSpouseAdditionalContribution}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <h3 className="text-h3 text-foreground">Private health insurance</h3>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Do you have a private health insurance?
            </Label>
            <SegmentedControl
              ariaLabel="Private health insurance"
              value={hasPrivateHealthInsurance}
              onChange={(next) => setHasPrivateHealthInsurance(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasPrivateHealthInsurance === "yes" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-body leading-relaxed">
                  Your contribution to private health insurance on your{" "}
                  <a
                    href={payslipHref}
                    className="text-sky-600 transition-colors hover:text-sky-500"
                  >
                    annual payslips
                  </a>{" "}
                  is EUR 0.00
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="private-basic-coverage"
                  className="text-sm font-medium text-foreground"
                >
                  Basic coverage contributions
                </Label>
                <Input
                  id="private-basic-coverage"
                  value={privateBasicCoverageContribution}
                  onChange={(event) => setPrivateBasicCoverageContribution(event.target.value)}
                  className="h-10"
                />
                <RequiredHint show={privateBasicCoverageContribution.trim().length === 0} />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="private-mandatory-nursing"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to mandatory nursing insurances (Pflege-Pflichtversicherung)
                  (Optional)
                </Label>
                <Input
                  id="private-mandatory-nursing"
                  value={privateMandatoryNursingContribution}
                  onChange={(event) => setPrivateMandatoryNursingContribution(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="private-reimbursed-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Reimbursed contributions (Optional)
                </Label>
                <Input
                  id="private-reimbursed-contribution"
                  value={privateReimbursedContribution}
                  onChange={(event) => setPrivateReimbursedContribution(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="private-third-party-subsidy"
                  className="text-sm font-medium text-foreground"
                >
                  Contribution subsidy from third party (Optional)
                </Label>
                <Input
                  id="private-third-party-subsidy"
                  value={privateThirdPartySubsidy}
                  onChange={(event) => setPrivateThirdPartySubsidy(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="private-optional-services"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to optional services and additional insurance (Optional)
                </Label>
                <Input
                  id="private-optional-services"
                  value={privateOptionalServicesContribution}
                  onChange={(event) => setPrivateOptionalServicesContribution(event.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <h3 className="text-h3 text-foreground">Spouse private health insurance</h3>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Does your spouse have a private health insurance?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse private health insurance"
              value={spouseHasPrivateHealthInsurance}
              onChange={(next) => setSpouseHasPrivateHealthInsurance(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <RequiredHint show={isSpousePrivateHealthInsuranceMissing} />
          </div>

          {spouseHasPrivateHealthInsurance === "yes" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-body leading-relaxed">
                  Your contribution to private health insurance on your{" "}
                  <a
                    href={spousePayslipHref}
                    className="text-sky-600 transition-colors hover:text-sky-500"
                  >
                    annual payslips
                  </a>{" "}
                  is EUR 0.00
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-private-basic-coverage"
                  className="text-sm font-medium text-foreground"
                >
                  Basic coverage contributions
                </Label>
                <Input
                  id="spouse-private-basic-coverage"
                  value={spousePrivateBasicCoverageContribution}
                  onChange={(event) =>
                    setSpousePrivateBasicCoverageContribution(event.target.value)
                  }
                  className="h-10"
                />
                <RequiredHint show={spousePrivateBasicCoverageContribution.trim().length === 0} />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-private-mandatory-nursing"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to mandatory nursing insurances (Pflege-Pflichtversicherung)
                  (Optional)
                </Label>
                <Input
                  id="spouse-private-mandatory-nursing"
                  value={spousePrivateMandatoryNursingContribution}
                  onChange={(event) =>
                    setSpousePrivateMandatoryNursingContribution(event.target.value)
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-private-reimbursed-contribution"
                  className="text-sm font-medium text-foreground"
                >
                  Reimbursed Contributions (Optional)
                </Label>
                <Input
                  id="spouse-private-reimbursed-contribution"
                  value={spousePrivateReimbursedContribution}
                  onChange={(event) => setSpousePrivateReimbursedContribution(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-private-third-party-subsidy"
                  className="text-sm font-medium text-foreground"
                >
                  Contribution subsidy from third party (Optional)
                </Label>
                <Input
                  id="spouse-private-third-party-subsidy"
                  value={spousePrivateThirdPartySubsidy}
                  onChange={(event) => setSpousePrivateThirdPartySubsidy(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-private-optional-services"
                  className="text-sm font-medium text-foreground"
                >
                  Contributions to optional services and additional insurance (Optional)
                </Label>
                <Input
                  id="spouse-private-optional-services"
                  value={spousePrivateOptionalServicesContribution}
                  onChange={(event) =>
                    setSpousePrivateOptionalServicesContribution(event.target.value)
                  }
                  className="h-10"
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
