import React from "react";
import { CircleAlert } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@corely/ui";
import { useNavigate } from "react-router-dom";
import type { BinaryChoice } from "./income-tax-return-shared";
import { SegmentedControl } from "./income-tax-return-shared";

type IncomeTaxReturnAdditionalExpensesStepProps = {
  onNext?: () => void;
};

type MoneyFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
};

const MoneyField = ({ id, label, value, onChange }: MoneyFieldProps) => (
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
  </div>
);

export const IncomeTaxReturnAdditionalExpensesStep = ({
  onNext,
}: IncomeTaxReturnAdditionalExpensesStepProps) => {
  const navigate = useNavigate();
  const taxYear = new Date().getFullYear() - 1;
  const [hasChildrenUnder18, setHasChildrenUnder18] = React.useState<BinaryChoice>("yes");
  const [hasDonations, setHasDonations] = React.useState<BinaryChoice>("yes");
  const [hasEmployeeExpensesOverThreshold, setHasEmployeeExpensesOverThreshold] =
    React.useState<BinaryChoice>("yes");
  const [donationsNationalCharities, setDonationsNationalCharities] = React.useState("€ 0");
  const [donationsEuInstitutions, setDonationsEuInstitutions] = React.useState("€ 0");
  const [donationsPoliticalParties, setDonationsPoliticalParties] = React.useState("€ 0");
  const [donationsVoterUnions, setDonationsVoterUnions] = React.useState("€ 0");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">Children expenses</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you or your spouse have any children under the age of 18?
              </Label>
              <SegmentedControl
                ariaLabel="Children under 18"
                value={hasChildrenUnder18}
                onChange={(next) => setHasChildrenUnder18(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasChildrenUnder18 === "yes" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-body text-foreground">Children expenses</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-sky-500 px-6 text-sky-500 hover:bg-sky-50 hover:text-sky-600"
                    onClick={() => navigate(`/income-statement/child/${taxYear}`)}
                  >
                    Add child
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 bg-card/70">
                      <TableHead className="font-semibold text-foreground">Child name</TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">Age</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-border/60 bg-card/30">
                      <TableCell
                        colSpan={3}
                        className="py-10 text-center text-body text-foreground/75"
                      >
                        No children added yet.{" "}
                        <button
                          type="button"
                          className="text-sky-500 hover:text-sky-400"
                          onClick={() => navigate(`/income-statement/child/${taxYear}`)}
                        >
                          Add child
                        </button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">Donations</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Have you or your spouse made any donations?
              </Label>
              <SegmentedControl
                ariaLabel="Donations"
                value={hasDonations}
                onChange={(next) => setHasDonations(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasDonations === "yes" ? (
              <div className="space-y-4">
                <MoneyField
                  id="donations-national-charities"
                  label="Donations to national charities (Optional)"
                  value={donationsNationalCharities}
                  onChange={setDonationsNationalCharities}
                />
                <MoneyField
                  id="donations-eu-institutions"
                  label="Donations to charitable institutions (EU/EEA) (Optional)"
                  value={donationsEuInstitutions}
                  onChange={setDonationsEuInstitutions}
                />
                <MoneyField
                  id="donations-political-parties"
                  label="Donations to political parties (Optional)"
                  value={donationsPoliticalParties}
                  onChange={setDonationsPoliticalParties}
                />
                <MoneyField
                  id="donations-voter-unions"
                  label="Donations to independent voter unions (Optional)"
                  value={donationsVoterUnions}
                  onChange={setDonationsVoterUnions}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-h3 text-foreground">Expenses as an employee</h2>
              <p className="max-w-4xl text-body text-muted-foreground">
                Includes expenses that were not paid by your employer, e.g. daily commuting to work,
                training, etc... The tax office takes into account 1000 EUR per year as
                income-related expenses which will be automatically deducted from taxable income
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Do you have expenses as an employee of more than 1000 EUR?
              </Label>
              <SegmentedControl
                ariaLabel="Employee expenses over threshold"
                value={hasEmployeeExpensesOverThreshold}
                onChange={(next) => setHasEmployeeExpensesOverThreshold(next as BinaryChoice)}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasEmployeeExpensesOverThreshold === "yes" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border border-sky-500/25 bg-sky-950/25 p-5 text-sky-100">
                  <div className="rounded-full border border-sky-400/70 p-2 text-sky-300">
                    <CircleAlert className="h-6 w-6" />
                  </div>
                  <p className="max-w-3xl text-body leading-relaxed">
                    You can declare those expenses with a tax consultant on the{" "}
                    <span className="text-sky-300">Paid add ons</span> section.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Usually relevant for employees with a long commute to workplace or with two
                  households
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {onNext ? (
        <div className="flex justify-end">
          <Button type="button" onClick={onNext} className="rounded-full px-8">
            Next: Info for the tax office
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default IncomeTaxReturnAdditionalExpensesStep;
