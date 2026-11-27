import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import type { AdditionalExpensesSectionPayload, ChildEntry } from "@corely/contracts";
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
  value: AdditionalExpensesSectionPayload;
  onChange: (next: AdditionalExpensesSectionPayload) => void;
  childrenEntries?: ChildEntry[];
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
  value,
  onChange,
  childrenEntries = [],
  onNext,
}: IncomeTaxReturnAdditionalExpensesStepProps) => {
  const uiCopy = useUiCopy("ui.tax-income-tax-return-additional-expenses-step");
  const navigate = useNavigate();
  const taxYear = new Date().getFullYear() - 1;
  const update = (patch: Partial<AdditionalExpensesSectionPayload>) =>
    onChange({ ...value, ...patch });
  const hasChildrenUnder18 = value.hasChildrenUnder18 as BinaryChoice;
  const hasDonations = value.hasDonations as BinaryChoice;
  const hasEmployeeExpensesOverThreshold = value.hasEmployeeExpensesOverThreshold as BinaryChoice;
  const donationsNationalCharities = value.donationsNationalCharities;
  const donationsEuInstitutions = value.donationsEuInstitutions;
  const donationsPoliticalParties = value.donationsPoliticalParties;
  const donationsVoterUnions = value.donationsVoterUnions;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h2 className="text-h3 text-foreground">{uiCopy("children-expenses")}</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {uiCopy("do-you-or-your")}
              </Label>
              <SegmentedControl
                ariaLabel="Children under 18"
                value={hasChildrenUnder18}
                onChange={(next) => update({ hasChildrenUnder18: next as BinaryChoice })}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />
            </div>

            {hasChildrenUnder18 === "yes" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-body text-foreground">{uiCopy("children-expenses")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-sky-500 px-6 text-sky-500 hover:bg-sky-50 hover:text-sky-600"
                    onClick={() => navigate(`/income-statement/child/${taxYear}`)}
                  >
                    {uiCopy("add-child")}
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 bg-card/70">
                      <TableHead className="font-semibold text-foreground">
                        {uiCopy("child-name")}
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        {uiCopy("age")}
                      </TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childrenEntries.length === 0 ? (
                      <TableRow className="border-border/60 bg-card/30">
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-body text-foreground/75"
                        >
                          {uiCopy("no-children-added-yet")}{" "}
                          <button
                            type="button"
                            className="text-sky-500 hover:text-sky-400"
                            onClick={() => navigate(`/income-statement/child/${taxYear}`)}
                          >
                            {uiCopy("add-child")}
                          </button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      childrenEntries.map((child) => {
                        const birthYear = child.birthDate
                          ? Number(child.birthDate.slice(0, 4))
                          : undefined;
                        const age = birthYear ? Math.max(0, taxYear - birthYear) : "—";
                        return (
                          <TableRow key={child.id} className="border-border/60 bg-card/30">
                            <TableCell className="text-body text-foreground">
                              {[child.firstName, child.lastName].filter(Boolean).join(" ") ||
                                uiCopy("unnamed-child")}
                            </TableCell>
                            <TableCell className="text-body text-foreground">{age}</TableCell>
                            <TableCell />
                          </TableRow>
                        );
                      })
                    )}
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
            <h2 className="text-h3 text-foreground">{uiCopy("donations")}</h2>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {uiCopy("have-you-or-your")}
              </Label>
              <SegmentedControl
                ariaLabel="Donations"
                value={hasDonations}
                onChange={(next) => update({ hasDonations: next as BinaryChoice })}
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
                  label={uiCopy("donations-to-national-charities")}
                  value={donationsNationalCharities}
                  onChange={(next) => update({ donationsNationalCharities: next })}
                />
                <MoneyField
                  id="donations-eu-institutions"
                  label={uiCopy("donations-to-charitable-institutions")}
                  value={donationsEuInstitutions}
                  onChange={(next) => update({ donationsEuInstitutions: next })}
                />
                <MoneyField
                  id="donations-political-parties"
                  label={uiCopy("donations-to-political-parties")}
                  value={donationsPoliticalParties}
                  onChange={(next) => update({ donationsPoliticalParties: next })}
                />
                <MoneyField
                  id="donations-voter-unions"
                  label={uiCopy("donations-to-independent-voter")}
                  value={donationsVoterUnions}
                  onChange={(next) => update({ donationsVoterUnions: next })}
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
              <h2 className="text-h3 text-foreground">{uiCopy("expenses-as-an-employee")}</h2>
              <p className="max-w-4xl text-body text-muted-foreground">
                {uiCopy("includes-expenses-that-were")}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {uiCopy("do-you-have-expenses")}
              </Label>
              <SegmentedControl
                ariaLabel="Employee expenses over threshold"
                value={hasEmployeeExpensesOverThreshold}
                onChange={(next) =>
                  update({ hasEmployeeExpensesOverThreshold: next as BinaryChoice })
                }
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
                    {uiCopy("you-can-declare-those")}{" "}
                    <span className="text-sky-300">{uiCopy("paid-add-ons")}</span>
                    {" " + uiCopy("section")}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  {uiCopy("usually-relevant-for-employees")}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {onNext ? (
        <div className="flex justify-end">
          <Button type="button" onClick={onNext} className="rounded-full px-8">
            {uiCopy("next-info-for-the")}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default IncomeTaxReturnAdditionalExpensesStep;
