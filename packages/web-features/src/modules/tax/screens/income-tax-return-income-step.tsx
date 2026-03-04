import React from "react";
import { Info } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import type { BinaryChoice } from "./income-tax-return-shared";
import { RequiredHint, SegmentedControl } from "./income-tax-return-shared";

export const IncomeTaxReturnIncomeStep = () => {
  const [spouseSelfEmploymentIncome, setSpouseSelfEmploymentIncome] =
    React.useState<BinaryChoice>("no");
  const [spouseSelfEmploymentStateRegister, setSpouseSelfEmploymentStateRegister] =
    React.useState("");
  const [spouseSelfEmploymentTaxNumber, setSpouseSelfEmploymentTaxNumber] = React.useState("");
  const [spouseLegalType, setSpouseLegalType] = React.useState("");
  const [spouseFreelancerProfit, setSpouseFreelancerProfit] = React.useState("");
  const [spouseCoronaAid, setSpouseCoronaAid] = React.useState<BinaryChoice | "">("");

  const [workedAsEmployee, setWorkedAsEmployee] = React.useState<BinaryChoice>("no");
  const [spouseWorkedAsEmployee, setSpouseWorkedAsEmployee] = React.useState<BinaryChoice>("yes");
  const [receivedUnemploymentBenefits, setReceivedUnemploymentBenefits] =
    React.useState<BinaryChoice>("no");
  const [spouseReceivedUnemploymentBenefits, setSpouseReceivedUnemploymentBenefits] =
    React.useState<BinaryChoice | "">("");
  const [incomeAbroad, setIncomeAbroad] = React.useState<BinaryChoice>("no");
  const [incomeFromInvestments, setIncomeFromInvestments] = React.useState<BinaryChoice>("no");

  const isSpouseSelfEmploymentDetailsMissing =
    spouseSelfEmploymentIncome === "yes" &&
    (!spouseSelfEmploymentStateRegister || spouseSelfEmploymentTaxNumber.trim().length === 0);
  const isSpouseLegalTypeMissing = spouseSelfEmploymentIncome === "yes" && !spouseLegalType;
  const isSpouseFreelancerProfitMissing =
    spouseSelfEmploymentIncome === "yes" && spouseFreelancerProfit.trim().length === 0;
  const isSpouseCoronaAidMissing = spouseSelfEmploymentIncome === "yes" && spouseCoronaAid === "";
  const isSpouseUnemploymentChoiceMissing = spouseReceivedUnemploymentBenefits === "";

  return (
    <>
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-h3 text-foreground">Income from self-employment</h2>
          <div className="space-y-1">
            <p className="text-h3 text-foreground">
              Your profit from working as a freelancer
              <span className="ml-2 text-green-600">€34,511.75</span>
            </p>
            <p className="text-body-sm text-muted-foreground">
              <button type="button" className="text-sky-600 hover:underline">
                Profit and loss report (EUR)
              </button>{" "}
              should be submitted to get the final amount
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did your spouse earn income from self-employment as a sole-trader or freelancer in
              2025?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse self-employment income"
              value={spouseSelfEmploymentIncome}
              onChange={(next) => setSpouseSelfEmploymentIncome(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {spouseSelfEmploymentIncome === "yes" ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Self-employment tax registration details of your spouse
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="spouse-self-employed-state"
                      className="text-xs text-muted-foreground"
                    >
                      State registered in
                    </Label>
                    <Select
                      value={spouseSelfEmploymentStateRegister}
                      onValueChange={setSpouseSelfEmploymentStateRegister}
                    >
                      <SelectTrigger id="spouse-self-employed-state" className="h-10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="berlin">Berlin</SelectItem>
                        <SelectItem value="bayern">Bavaria</SelectItem>
                        <SelectItem value="hamburg">Hamburg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="spouse-self-employed-tax-number"
                      className="text-xs text-muted-foreground"
                    >
                      Tax number
                    </Label>
                    <Input
                      id="spouse-self-employed-tax-number"
                      value={spouseSelfEmploymentTaxNumber}
                      onChange={(event) => setSpouseSelfEmploymentTaxNumber(event.target.value)}
                      placeholder="e.g. 12/345/67890"
                      className="h-10"
                    />
                  </div>
                </div>
                <RequiredHint show={isSpouseSelfEmploymentDetailsMissing} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse-legal-type" className="text-sm font-medium text-foreground">
                  Legal type of your spouse's business
                </Label>
                <Select value={spouseLegalType} onValueChange={setSpouseLegalType}>
                  <SelectTrigger id="spouse-legal-type" className="h-10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole-trader">Sole-trader</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <button type="button" className="text-xs text-sky-600 hover:underline">
                  Help me find my spouse&apos;s legal type
                </button>
                <RequiredHint show={isSpouseLegalTypeMissing} />
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-body-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Please note: If your spouse has income from self-employment, Sorted currently
                    only supports the joint filing of your income tax report if your spouse is a
                    sole-trader or freelancer.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="spouse-freelancer-profit"
                  className="text-sm font-medium text-foreground"
                >
                  Profit from working as a freelancer in 2025
                </Label>
                <Input
                  id="spouse-freelancer-profit"
                  value={spouseFreelancerProfit}
                  onChange={(event) => setSpouseFreelancerProfit(event.target.value)}
                  placeholder="€ 0.00"
                  className="h-10"
                />
                <RequiredHint show={isSpouseFreelancerProfitMissing} />
              </div>

              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-body-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Please note: Your spouse needs to separately file a profit and loss report (EUR)
                    with the tax office.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Did your spouse receive or pay back any governmental Corona aid during 2025?
                </Label>
                <SegmentedControl
                  ariaLabel="Spouse corona aid"
                  value={spouseCoronaAid}
                  onChange={(next) => setSpouseCoronaAid(next as BinaryChoice)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
                <RequiredHint show={isSpouseCoronaAidMissing} />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-h3 text-foreground">Income as an employee</h2>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did you work as an employee in 2025?
            </Label>
            <SegmentedControl
              ariaLabel="Worked as employee"
              value={workedAsEmployee}
              onChange={(next) => setWorkedAsEmployee(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did your spouse work as an employee in 2025?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse worked as employee"
              value={spouseWorkedAsEmployee}
              onChange={(next) => setSpouseWorkedAsEmployee(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-body font-medium text-foreground">
                Annual payslips (Lohnsteuerbescheinigung)
              </p>
              <Button variant="outline" className="rounded-full px-5">
                Add annual payslip
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground">
                      Total salary
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">
                      Employment dates
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-foreground" />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="px-3 py-5 text-center text-muted-foreground">
                      No payslips added yet.{" "}
                      <button type="button" className="text-sky-600 hover:underline">
                        Add annual payslip
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-h3 text-foreground">Unemployment benefits (ALG 1)</h2>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did you receive unemployment benefits (ALG 1)?
            </Label>
            <SegmentedControl
              ariaLabel="Received unemployment benefits"
              value={receivedUnemploymentBenefits}
              onChange={(next) => setReceivedUnemploymentBenefits(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did your spouse receive unemployment benefits (ALG 1)?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse unemployment benefits"
              value={spouseReceivedUnemploymentBenefits}
              onChange={(next) => setSpouseReceivedUnemploymentBenefits(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <RequiredHint show={isSpouseUnemploymentChoiceMissing} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-h3 text-foreground">Income earned while living abroad</h2>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did you or your spouse earn any income while living outside of Germany in 2025?
            </Label>
            <SegmentedControl
              ariaLabel="Income abroad"
              value={incomeAbroad}
              onChange={(next) => setIncomeAbroad(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-h3 text-foreground">Income from investments</h2>
          <p className="text-body-sm text-muted-foreground">
            If you invest through a German financial institution, taxes are usually deducted from
            your profits automatically.
            <button type="button" className="ml-1 text-sky-600 hover:underline">
              Learn more
            </button>
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Did you or your spouse earn in 2025 above €800 from investments which are not
              automatically taxed in Germany?
            </Label>
            <SegmentedControl
              ariaLabel="Income from investments"
              value={incomeFromInvestments}
              onChange={(next) => setIncomeFromInvestments(next as BinaryChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-body-sm text-blue-900">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                You can declare income from investments with a tax consultant on the Paid add ons
                section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
