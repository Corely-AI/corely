import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, Label } from "@corely/ui";
import type { BinaryChoice } from "./income-tax-return-shared";
import { OptionalMoneyField, RequiredHint, SegmentedControl } from "./income-tax-return-shared";

export const IncomeTaxReturnHealthInsuranceStep = () => {
  const [hasStatutoryHealthInsurance, setHasStatutoryHealthInsurance] =
    React.useState<BinaryChoice>("yes");
  const [statutoryContributionSelfEmployed, setStatutoryContributionSelfEmployed] =
    React.useState("€ 0");
  const [contributionWithSickBenefit, setContributionWithSickBenefit] = React.useState("€ 0");
  const [nursingContributionSelfEmployed, setNursingContributionSelfEmployed] =
    React.useState("€ 0");
  const [refundedContribution, setRefundedContribution] = React.useState("€ 0");
  const [refundedContributionWithSickBenefit, setRefundedContributionWithSickBenefit] =
    React.useState("€ 0");
  const [voluntaryContributionSubsidy, setVoluntaryContributionSubsidy] = React.useState("€ 0");
  const [additionalContribution, setAdditionalContribution] = React.useState("€ 0");
  const [spouseHasStatutoryHealthInsurance, setSpouseHasStatutoryHealthInsurance] = React.useState<
    BinaryChoice | ""
  >("");
  const [hasPrivateHealthInsurance, setHasPrivateHealthInsurance] =
    React.useState<BinaryChoice>("no");
  const [spouseHasPrivateHealthInsurance, setSpouseHasPrivateHealthInsurance] = React.useState<
    BinaryChoice | ""
  >("");

  const isSpouseStatutoryHealthInsuranceMissing = spouseHasStatutoryHealthInsurance === "";
  const isSpousePrivateHealthInsuranceMissing = spouseHasPrivateHealthInsurance === "";
  const hasHealthInsuranceMissingRequired =
    isSpouseStatutoryHealthInsuranceMissing || isSpousePrivateHealthInsuranceMissing;

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
              <OptionalMoneyField
                id="statutory-contribution-self-employed"
                label="Contributions to health insurance as a self employed (Optional)"
                helperText="Enter the amount that matches line 16 in your proof of health insurance"
                value={statutoryContributionSelfEmployed}
                onChange={setStatutoryContributionSelfEmployed}
              />
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
        </div>
      </CardContent>
    </Card>
  );
};
