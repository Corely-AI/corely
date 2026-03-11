import React from "react";
import { CircleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type {
  AnnualIncomeSectionPayload,
  IncomeSectionPayload,
  PayslipEntry,
} from "@corely/contracts";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@corely/ui";
import { COUNTRY_OPTIONS } from "@corely/web-shared/lib/country-options";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { useNavigate } from "react-router-dom";
import { GERMAN_STATE_OPTIONS, RequiredHint, SegmentedControl } from "./income-tax-return-shared";
import { formatLocalDate } from "./tax-date";

type IncomeTaxReturnIncomeStepProps = {
  filingId: string;
  reportId: string;
  value: IncomeSectionPayload;
  onChange: (next: IncomeSectionPayload) => void;
  payslipEntries?: PayslipEntry[];
  disabled?: boolean;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const getFallbackProfit = (payload: AnnualIncomeSectionPayload) =>
  payload.incomeSources
    .filter((source) => source.type === "self_employed" || source.type === "freelance")
    .reduce(
      (sum, source) => sum + source.amounts.grossIncome - (source.amounts.expensesRelated ?? 0),
      0
    );

const SPOUSE_LEGAL_TYPE_OPTIONS = [
  { value: "sole-trader", label: "Sole trader" },
  { value: "freelancer", label: "Freelancer" },
  { value: "civil-law-partnership", label: "Civil law partnership (GbR)" },
  { value: "ug", label: "UG (haftungsbeschraenkt)" },
  { value: "gmbh", label: "GmbH" },
  { value: "other", label: "Other" },
] as const;

const SECTION_TITLE_CLASS = "text-h3 text-foreground";
const QUESTION_TEXT_CLASS = "max-w-4xl text-body text-foreground";
const FIELD_LABEL_CLASS = "text-sm font-medium text-foreground";
const SUBSECTION_TITLE_CLASS = "text-h3 text-foreground";
const INFO_CARD_CLASS =
  "flex items-start gap-4 rounded-xl border border-sky-500/25 bg-sky-950/25 p-5 text-sky-100";
const INFO_TEXT_CLASS = "max-w-3xl text-body leading-relaxed";

export const IncomeTaxReturnIncomeStep = ({
  filingId,
  reportId,
  value,
  onChange,
  payslipEntries = [],
}: IncomeTaxReturnIncomeStepProps) => {
  const navigate = useNavigate();
  const update = (patch: Partial<IncomeSectionPayload>) => onChange({ ...value, ...patch });
  const annualIncome = value.annualIncome;
  const spouseHasSelfEmploymentIncome = value.spouseHasSelfEmploymentIncome;
  const spouseTaxState = value.spouseTaxState;
  const spouseTaxNumber = value.spouseTaxNumber;
  const spouseLegalType = value.spouseLegalType;
  const spouseProfit = value.spouseProfit;
  const spouseCoronaAid = value.spouseCoronaAid;
  const spouseCoronaAidAmount = value.spouseCoronaAidAmount;
  const hasEmploymentIncome = value.hasEmploymentIncome;
  const spouseHasEmploymentIncome = value.spouseHasEmploymentIncome;
  const hasUnemploymentBenefits = value.hasUnemploymentBenefits;
  const unemploymentBenefitsAmount = value.unemploymentBenefitsAmount;
  const spouseHasUnemploymentBenefits = value.spouseHasUnemploymentBenefits;
  const spouseUnemploymentBenefitsAmount = value.spouseUnemploymentBenefitsAmount;
  const hasIncomeAbroad = value.hasIncomeAbroad;
  const moveDirection = value.moveDirection;
  const incomeAbroadAmount = value.incomeAbroadAmount;
  const livedOutsideGermany = value.livedOutsideGermany;
  const departureDate = value.departureDate
    ? new Date(`${value.departureDate}T00:00:00`)
    : undefined;
  const residenceCountry = value.residenceCountry;
  const addressOutsideGermany = value.addressOutsideGermany;
  const ownedCompanyWhenLeaving = value.ownedCompanyWhenLeaving;
  const intendReturnWithinSevenYears = value.intendReturnWithinSevenYears;
  const movedToLowTaxCountry = value.movedToLowTaxCountry;
  const spouseLivedOutsideGermany = value.spouseLivedOutsideGermany;
  const spouseDepartureDate = value.spouseDepartureDate
    ? new Date(`${value.spouseDepartureDate}T00:00:00`)
    : undefined;
  const spouseResidenceCountry = value.spouseResidenceCountry;
  const spouseAddressOutsideGermany = value.spouseAddressOutsideGermany;
  const spouseOwnedCompanyWhenLeaving = value.spouseOwnedCompanyWhenLeaving;
  const spouseIntendReturnWithinSevenYears = value.spouseIntendReturnWithinSevenYears;
  const spouseMovedToLowTaxCountry = value.spouseMovedToLowTaxCountry;
  const hasInvestmentIncome = value.hasInvestmentIncome;
  const taxYear = new Date().getFullYear() - 1;

  const setSpouseHasSelfEmploymentIncome = (next: "yes" | "no") =>
    update({ spouseHasSelfEmploymentIncome: next });
  const setSpouseTaxState = (next: string) => update({ spouseTaxState: next });
  const setSpouseTaxNumber = (next: string) => update({ spouseTaxNumber: next });
  const setSpouseLegalType = (next: string) => update({ spouseLegalType: next });
  const setSpouseProfit = (next: string) => update({ spouseProfit: next });
  const setSpouseCoronaAid = (next: "yes" | "no" | "") => update({ spouseCoronaAid: next });
  const setSpouseCoronaAidAmount = (next: string) => update({ spouseCoronaAidAmount: next });
  const setHasEmploymentIncome = (next: "yes" | "no") => update({ hasEmploymentIncome: next });
  const setSpouseHasEmploymentIncome = (next: "yes" | "no") =>
    update({ spouseHasEmploymentIncome: next });
  const setHasUnemploymentBenefits = (next: "yes" | "no") =>
    update({ hasUnemploymentBenefits: next });
  const setUnemploymentBenefitsAmount = (next: string) =>
    update({ unemploymentBenefitsAmount: next });
  const setSpouseHasUnemploymentBenefits = (next: "yes" | "no") =>
    update({ spouseHasUnemploymentBenefits: next });
  const setSpouseUnemploymentBenefitsAmount = (next: string) =>
    update({ spouseUnemploymentBenefitsAmount: next });
  const setHasIncomeAbroad = (next: "yes" | "no") => update({ hasIncomeAbroad: next });
  const setMoveDirection = (next: "moved-to-germany" | "moved-out-of-germany" | "") =>
    update({ moveDirection: next });
  const setIncomeAbroadAmount = (next: string) => update({ incomeAbroadAmount: next });
  const setLivedOutsideGermany = (next: "yes" | "no") => update({ livedOutsideGermany: next });
  const setDepartureDate = (next: Date | undefined) =>
    update({ departureDate: formatLocalDate(next) });
  const setResidenceCountry = (next: string) => update({ residenceCountry: next });
  const setAddressOutsideGermany = (next: string) => update({ addressOutsideGermany: next });
  const setOwnedCompanyWhenLeaving = (next: "yes" | "no" | "") =>
    update({ ownedCompanyWhenLeaving: next });
  const setIntendReturnWithinSevenYears = (next: "yes" | "no" | "") =>
    update({ intendReturnWithinSevenYears: next });
  const setMovedToLowTaxCountry = (next: "yes" | "no" | "") =>
    update({ movedToLowTaxCountry: next });
  const setSpouseLivedOutsideGermany = (next: "yes" | "no") =>
    update({ spouseLivedOutsideGermany: next });
  const setSpouseDepartureDate = (next: Date | undefined) =>
    update({ spouseDepartureDate: formatLocalDate(next) });
  const setSpouseResidenceCountry = (next: string) => update({ spouseResidenceCountry: next });
  const setSpouseAddressOutsideGermany = (next: string) =>
    update({ spouseAddressOutsideGermany: next });
  const setSpouseOwnedCompanyWhenLeaving = (next: "yes" | "no" | "") =>
    update({ spouseOwnedCompanyWhenLeaving: next });
  const setSpouseIntendReturnWithinSevenYears = (next: "yes" | "no" | "") =>
    update({ spouseIntendReturnWithinSevenYears: next });
  const setSpouseMovedToLowTaxCountry = (next: "yes" | "no" | "") =>
    update({ spouseMovedToLowTaxCountry: next });
  const setHasInvestmentIncome = (next: "yes" | "no") => update({ hasInvestmentIncome: next });

  const residenceDateLabel =
    moveDirection === "moved-out-of-germany"
      ? "When did you leave Germany?"
      : "When did you move to Germany?";
  const residenceDatePlaceholder = departureDate
    ? departureDate.toLocaleDateString("de-DE")
    : "Select date...";
  const spouseResidenceDatePlaceholder = spouseDepartureDate
    ? spouseDepartureDate.toLocaleDateString("de-DE")
    : "Select date...";

  const eurStatementQuery = useQuery({
    queryKey: ["tax", "reports", "eur", "income-step", filingId, reportId, taxYear],
    queryFn: () => taxApi.getEurStatement({ year: taxYear }),
  });

  const profitAmount =
    eurStatementQuery.data?.totals.profitCents != null
      ? eurStatementQuery.data.totals.profitCents / 100
      : getFallbackProfit(annualIncome);
  const shouldShowSpouseSelfEmploymentDetails = spouseHasSelfEmploymentIncome === "yes";

  const openPayslip = (partner: "spouse" | "main-partner") => {
    navigate(`/income-statement/payslip/${taxYear}/${partner}`);
  };

  const PayslipSection = ({ partner }: { partner: "spouse" | "main-partner" }) => (
    <div className="space-y-6">
      {(() => {
        const rows = payslipEntries.filter(
          (entry) => entry.partner === partner && entry.year === taxYear
        );
        return (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-h3 text-foreground">
                Annual payslips
                <br />
                (Lohnsteuerbescheinigung)
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => openPayslip(partner)}
                className="h-auto rounded-full border-sky-500 px-8 py-4 text-xl text-sky-500 hover:bg-sky-50 hover:text-sky-600"
              >
                Add annual
                <br />
                payslip
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-border/60 bg-card/70">
                  <TableHead className="text-lg font-semibold text-foreground">
                    Total salary
                  </TableHead>
                  <TableHead className="text-lg font-semibold text-foreground">
                    Employment dates
                  </TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="border-border/60 bg-card/30">
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-body text-foreground/75"
                    >
                      No payslips added yet.{" "}
                      <button
                        type="button"
                        onClick={() => openPayslip(partner)}
                        className="text-sky-500 hover:text-sky-400"
                      >
                        Add annual payslip
                      </button>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((entry) => {
                    const totalSalary = entry.values["3"] || "€ 0.00";
                    const periodLabel =
                      entry.periodStart && entry.periodEnd
                        ? `${new Date(`${entry.periodStart}T00:00:00`).toLocaleDateString("de-DE")} - ${new Date(`${entry.periodEnd}T00:00:00`).toLocaleDateString("de-DE")}`
                        : "Not provided";
                    return (
                      <TableRow key={entry.id} className="border-border/60 bg-card/30">
                        <TableCell className="text-body text-foreground">{totalSalary}</TableCell>
                        <TableCell className="text-body text-foreground">{periodLabel}</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </>
        );
      })()}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-10 p-6 md:p-8">
          <div className="space-y-8">
            <h2 className={SECTION_TITLE_CLASS}>Income from self-employment</h2>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-body font-medium leading-relaxed text-foreground">
                  Your profit from working as a freelancer (Selbststaendiger Arbeit)
                </p>
                <p className="text-body text-muted-foreground">
                  <a
                    href={`/tax/reports/eur?year=${taxYear}`}
                    className="text-sky-500 transition-colors hover:text-sky-400"
                  >
                    Profit and loss report (EÜR)
                  </a>{" "}
                  should be submitted to get the final amount
                </p>
              </div>

              <div className="shrink-0 text-left text-4xl font-medium text-emerald-500 md:text-right">
                {formatMoney(profitAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>
              Did your spouse earn income from self-employment as a sole-trader or freelancer in{" "}
              {taxYear}?
            </p>

            <SegmentedControl
              ariaLabel="Spouse self-employment income"
              value={spouseHasSelfEmploymentIncome}
              onChange={(next) => setSpouseHasSelfEmploymentIncome(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {shouldShowSpouseSelfEmploymentDetails ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-body font-medium text-foreground">
                  Self-employment tax registration details of your spouse
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="spouse-tax-state" className={FIELD_LABEL_CLASS}>
                      State registered in
                    </Label>
                    <Select value={spouseTaxState} onValueChange={setSpouseTaxState}>
                      <SelectTrigger id="spouse-tax-state" className="h-10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {GERMAN_STATE_OPTIONS.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="spouse-self-employment-tax-number"
                      className={FIELD_LABEL_CLASS}
                    >
                      Tax number
                    </Label>
                    <Input
                      id="spouse-self-employment-tax-number"
                      value={spouseTaxNumber}
                      onChange={(event) => setSpouseTaxNumber(event.target.value)}
                      placeholder="e.g. 12/345/67890"
                      className="h-10"
                    />
                    <RequiredHint show={spouseTaxNumber.trim().length === 0} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse-legal-type" className={FIELD_LABEL_CLASS}>
                  Legal type of your spouse&apos;s business
                </Label>
                <Select value={spouseLegalType} onValueChange={setSpouseLegalType}>
                  <SelectTrigger id="spouse-legal-type" className="h-10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPOUSE_LEGAL_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" className="text-sm text-sky-500 hover:text-sky-400">
                  Help me find my spouse&apos;s legal type
                </button>
                <RequiredHint show={spouseLegalType.length === 0} />
              </div>

              <div className={INFO_CARD_CLASS}>
                <div className="rounded-full border border-sky-400/70 p-2 text-sky-300">
                  <CircleAlert className="h-6 w-6" />
                </div>
                <p className={INFO_TEXT_CLASS}>
                  Please note: If your spouse has income from self-employment, Corely currently only
                  supports the joint filing of your income tax report if your spouse is a
                  sole-trader or freelancer.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse-profit" className={FIELD_LABEL_CLASS}>
                  Profit from working as a freelancer (Selbststaendiger Arbeit, Line 109 of the
                  profit and loss report (EÜR)) in {taxYear}
                </Label>
                <Input
                  id="spouse-profit"
                  value={spouseProfit}
                  onChange={(event) => setSpouseProfit(event.target.value)}
                  placeholder="€ 0.00"
                  className="h-10"
                />
                <RequiredHint show={spouseProfit.trim().length === 0} />
              </div>

              <div className={INFO_CARD_CLASS}>
                <div className="rounded-full border border-sky-400/70 p-2 text-sky-300">
                  <CircleAlert className="h-6 w-6" />
                </div>
                <p className={INFO_TEXT_CLASS}>
                  Please note: Your spouse needs to separately file a profit and loss report (EÜR)
                  with the tax office.
                </p>
              </div>

              <div className="space-y-4">
                <p className={QUESTION_TEXT_CLASS}>
                  Did your spouse receive or pay back any governmental Corona aid during {taxYear}?
                </p>

                <SegmentedControl
                  ariaLabel="Spouse Corona aid"
                  value={spouseCoronaAid}
                  onChange={(next) => setSpouseCoronaAid(next as "yes" | "no")}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
                <RequiredHint show={spouseCoronaAid === ""} />
              </div>

              {spouseCoronaAid === "yes" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="spouse-corona-aid-amount" className={FIELD_LABEL_CLASS}>
                      Total amount of governmental Corona aid received or paid back by your spouse
                      in {taxYear} (please enter the difference between received and paid back
                      amounts and enter a negative amount if your spouse paid back more aid then
                      received)
                    </Label>
                    <Input
                      id="spouse-corona-aid-amount"
                      value={spouseCoronaAidAmount}
                      onChange={(event) => setSpouseCoronaAidAmount(event.target.value)}
                      placeholder="€ 0.00"
                      className="h-10"
                    />
                    <RequiredHint show={spouseCoronaAidAmount.trim().length === 0} />
                  </div>

                  <div className={INFO_CARD_CLASS}>
                    <div className="rounded-full border border-sky-400/70 p-2 text-sky-300">
                      <CircleAlert className="h-6 w-6" />
                    </div>
                    <p className={INFO_TEXT_CLASS}>
                      Please note: if your spouse received or paid back any governmental Corona aid
                      during {taxYear}, please make sure it was recorded as income or expense in the
                      tax reports accordingly.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-10 p-6 md:p-8">
          <h2 className={SECTION_TITLE_CLASS}>Income as an employee</h2>

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>Did you work as an employee in {taxYear}?</p>
            <SegmentedControl
              ariaLabel="Employment income"
              value={hasEmploymentIncome}
              onChange={(next) => setHasEmploymentIncome(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasEmploymentIncome === "yes" ? <PayslipSection partner="main-partner" /> : null}

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>Did your spouse work as an employee in {taxYear}?</p>
            <SegmentedControl
              ariaLabel="Spouse employment income"
              value={spouseHasEmploymentIncome}
              onChange={(next) => setSpouseHasEmploymentIncome(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {spouseHasEmploymentIncome === "yes" ? <PayslipSection partner="spouse" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-10 p-6 md:p-8">
          <h2 className={SECTION_TITLE_CLASS}>Unemployment benefits (ALG 1)</h2>

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>Did you receive unemployment benefits (ALG 1)?</p>
            <SegmentedControl
              ariaLabel="Unemployment benefits"
              value={hasUnemploymentBenefits}
              onChange={(next) => setHasUnemploymentBenefits(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasUnemploymentBenefits === "yes" ? (
            <div className="space-y-2">
              <Label htmlFor="unemployment-benefits-amount" className={FIELD_LABEL_CLASS}>
                Unemployment benefits received
              </Label>
              <Input
                id="unemployment-benefits-amount"
                value={unemploymentBenefitsAmount}
                onChange={(event) => setUnemploymentBenefitsAmount(event.target.value)}
                placeholder="€ 0.00"
                className="h-10"
              />
              <RequiredHint show={unemploymentBenefitsAmount.trim().length === 0} />
            </div>
          ) : null}

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>
              Did your spouse receive unemployment benefits (ALG 1)?
            </p>
            <SegmentedControl
              ariaLabel="Spouse unemployment benefits"
              value={spouseHasUnemploymentBenefits}
              onChange={(next) => setSpouseHasUnemploymentBenefits(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {spouseHasUnemploymentBenefits === "yes" ? (
            <div className="space-y-2">
              <Label htmlFor="spouse-unemployment-benefits-amount" className={FIELD_LABEL_CLASS}>
                Spouse unemployment benefits received
              </Label>
              <Input
                id="spouse-unemployment-benefits-amount"
                value={spouseUnemploymentBenefitsAmount}
                onChange={(event) => setSpouseUnemploymentBenefitsAmount(event.target.value)}
                placeholder="€ 0.00"
                className="h-10"
              />
              <RequiredHint show={spouseUnemploymentBenefitsAmount.trim().length === 0} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-10 p-6 md:p-8">
          <h2 className={SECTION_TITLE_CLASS}>Income earned while living abroad</h2>

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>
              Did you or your spouse earn any income while living outside of Germany in {taxYear}?
            </p>
            <SegmentedControl
              ariaLabel="Income while living abroad"
              value={hasIncomeAbroad}
              onChange={(next) => setHasIncomeAbroad(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasIncomeAbroad === "yes" ? (
            <>
              <div className="space-y-4">
                <p className={QUESTION_TEXT_CLASS}>
                  Did you move to Germany or out of Germany in {taxYear}?
                </p>
                <SegmentedControl
                  ariaLabel="Move direction"
                  value={moveDirection}
                  onChange={(next) =>
                    setMoveDirection(next as "moved-to-germany" | "moved-out-of-germany")
                  }
                  options={[
                    { value: "moved-to-germany", label: "Moved to Germany" },
                    { value: "moved-out-of-germany", label: "Moved out of Germany" },
                  ]}
                />
                <RequiredHint show={moveDirection === ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="income-abroad-amount" className={FIELD_LABEL_CLASS}>
                  Total income earned abroad in {taxYear}
                </Label>
                <Input
                  id="income-abroad-amount"
                  value={incomeAbroadAmount}
                  onChange={(event) => setIncomeAbroadAmount(event.target.value)}
                  placeholder="€ 0"
                  className="h-10"
                />
                <RequiredHint show={incomeAbroadAmount.trim().length === 0} />
              </div>

              <div className="space-y-4">
                <h3 className={SUBSECTION_TITLE_CLASS}>Your residence details</h3>
                <p className={QUESTION_TEXT_CLASS}>Did you live outside of Germany in {taxYear}?</p>
                <SegmentedControl
                  ariaLabel="Your residence details"
                  value={livedOutsideGermany}
                  onChange={(next) => setLivedOutsideGermany(next as "yes" | "no")}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />

                {livedOutsideGermany === "yes" ? (
                  <div className="space-y-8 pt-2">
                    <div className="space-y-2">
                      <Label className={FIELD_LABEL_CLASS}>{residenceDateLabel}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-10 w-full justify-start text-left font-normal",
                              !departureDate && "text-muted-foreground"
                            )}
                          >
                            {residenceDatePlaceholder}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departureDate}
                            onSelect={setDepartureDate}
                          />
                        </PopoverContent>
                      </Popover>
                      <RequiredHint show={!departureDate} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="residence-country" className={FIELD_LABEL_CLASS}>
                        Country of residence outside of Germany
                      </Label>
                      <Select value={residenceCountry} onValueChange={setResidenceCountry}>
                        <SelectTrigger id="residence-country" className="h-10">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <RequiredHint show={residenceCountry.length === 0} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abroad-address" className={FIELD_LABEL_CLASS}>
                        Address outside of Germany
                      </Label>
                      <Input
                        id="abroad-address"
                        value={addressOutsideGermany}
                        onChange={(event) => setAddressOutsideGermany(event.target.value)}
                        className="h-10"
                      />
                      <RequiredHint show={addressOutsideGermany.trim().length === 0} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Did you own a company (corporation or cooperative) when you left Germany?
                      </p>
                      <SegmentedControl
                        ariaLabel="Owned company when leaving Germany"
                        value={ownedCompanyWhenLeaving}
                        onChange={(next) => setOwnedCompanyWhenLeaving(next as "yes" | "no")}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <p className="text-sm text-muted-foreground">
                        A shareholder owning above 1% of the shares is considered an owner
                      </p>
                      <RequiredHint show={ownedCompanyWhenLeaving === ""} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Do you intend to return to Germany within 7 years of the date on which your
                        unlimited tax liability ends?
                      </p>
                      <SegmentedControl
                        ariaLabel="Return to Germany within seven years"
                        value={intendReturnWithinSevenYears}
                        onChange={(next) => setIntendReturnWithinSevenYears(next as "yes" | "no")}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <RequiredHint show={intendReturnWithinSevenYears === ""} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Did you move to a country where taxes are significantly lower than Germany?
                      </p>
                      <SegmentedControl
                        ariaLabel="Moved to low-tax country"
                        value={movedToLowTaxCountry}
                        onChange={(next) => setMovedToLowTaxCountry(next as "yes" | "no")}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <p className="text-sm text-muted-foreground">
                        A country is considered to have a lower tax rate if the income tax is a
                        third lower than Germany for a fictitious income of EUR 77,000. If you are
                        not sure, you can ask the tax office or your tax consultant on Sorted about
                        that.
                      </p>
                      <RequiredHint show={movedToLowTaxCountry === ""} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <h3 className={SUBSECTION_TITLE_CLASS}>Your spouse residence details</h3>
                <p className={QUESTION_TEXT_CLASS}>
                  Did your spouse live outside of Germany in {taxYear}?
                </p>
                <SegmentedControl
                  ariaLabel="Spouse residence details"
                  value={spouseLivedOutsideGermany}
                  onChange={(next) => setSpouseLivedOutsideGermany(next as "yes" | "no")}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />

                {spouseLivedOutsideGermany === "yes" ? (
                  <div className="space-y-8 pt-2">
                    <div className="space-y-2">
                      <Label className={FIELD_LABEL_CLASS}>
                        When did your spouse leave Germany?
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-10 w-full justify-start text-left font-normal",
                              !spouseDepartureDate && "text-muted-foreground"
                            )}
                          >
                            {spouseResidenceDatePlaceholder}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={spouseDepartureDate}
                            onSelect={setSpouseDepartureDate}
                          />
                        </PopoverContent>
                      </Popover>
                      <RequiredHint show={!spouseDepartureDate} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="spouse-residence-country" className={FIELD_LABEL_CLASS}>
                        Country of residence outside of Germany
                      </Label>
                      <Select
                        value={spouseResidenceCountry}
                        onValueChange={setSpouseResidenceCountry}
                      >
                        <SelectTrigger id="spouse-residence-country" className="h-10">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <RequiredHint show={spouseResidenceCountry.length === 0} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="spouse-address-outside-germany" className={FIELD_LABEL_CLASS}>
                        Address outside of Germany
                      </Label>
                      <Input
                        id="spouse-address-outside-germany"
                        value={spouseAddressOutsideGermany}
                        onChange={(event) => setSpouseAddressOutsideGermany(event.target.value)}
                        className="h-10"
                      />
                      <RequiredHint show={spouseAddressOutsideGermany.trim().length === 0} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Did your spouse own a company (corporation or cooperative) when you left
                        Germany?
                      </p>
                      <SegmentedControl
                        ariaLabel="Spouse owned company when leaving Germany"
                        value={spouseOwnedCompanyWhenLeaving}
                        onChange={(next) => setSpouseOwnedCompanyWhenLeaving(next as "yes" | "no")}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <p className="text-sm text-muted-foreground">
                        A shareholder owning above 1% of the shares is considered an owner
                      </p>
                      <RequiredHint show={spouseOwnedCompanyWhenLeaving === ""} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Does your spouse intend to return to Germany within 7 years of the date on
                        which your unlimited tax liability ends?
                      </p>
                      <SegmentedControl
                        ariaLabel="Spouse return to Germany within seven years"
                        value={spouseIntendReturnWithinSevenYears}
                        onChange={(next) =>
                          setSpouseIntendReturnWithinSevenYears(next as "yes" | "no")
                        }
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <RequiredHint show={spouseIntendReturnWithinSevenYears === ""} />
                    </div>

                    <div className="space-y-4">
                      <p className="max-w-4xl text-base leading-snug text-foreground">
                        Did your spouse move to a country where taxes are significantly lower than
                        Germany?
                      </p>
                      <SegmentedControl
                        ariaLabel="Spouse moved to low-tax country"
                        value={spouseMovedToLowTaxCountry}
                        onChange={(next) => setSpouseMovedToLowTaxCountry(next as "yes" | "no")}
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                      />
                      <p className="text-sm text-muted-foreground">
                        A country is considered to have a lower tax rate if the income tax is a
                        third lower than Germany for a fictitious income of EUR 77,000. If you are
                        not sure, you can ask the tax office or your tax consultant on Sorted about
                        that.
                      </p>
                      <RequiredHint show={spouseMovedToLowTaxCountry === ""} />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-10 p-6 md:p-8">
          <div className="space-y-2">
            <h2 className={SECTION_TITLE_CLASS}>Income from investments</h2>
            <p className="max-w-4xl text-body text-muted-foreground">
              If you invest through a German financial institution, for example a bank, your taxes
              are automatically deducted from your profits. If they are not automatically deducted
              and you have exceeded EUR 800 you will need to report them as part of your income tax
              return.{" "}
              <button type="button" className="text-sky-500 hover:text-sky-400">
                Learn more
              </button>
            </p>
          </div>

          <div className="space-y-4">
            <p className={QUESTION_TEXT_CLASS}>
              Did you or your spouse earn in {taxYear} above EUR 800 from investments which are not
              automatically taxed in Germany?
            </p>
            <SegmentedControl
              ariaLabel="Income from investments"
              value={hasInvestmentIncome}
              onChange={(next) => setHasInvestmentIncome(next as "yes" | "no")}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>

          {hasInvestmentIncome === "yes" ? (
            <div className={INFO_CARD_CLASS}>
              <div className="rounded-full border border-sky-400/70 p-2 text-sky-300">
                <CircleAlert className="h-6 w-6" />
              </div>
              <p className={INFO_TEXT_CLASS}>
                You can declare income from investments with a tax consultant on the{" "}
                <span className="text-sky-300">Paid add ons</span> section.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-8 p-6 md:p-8">
          <h2 className={SECTION_TITLE_CLASS}>Other sources of income</h2>
          <p className="max-w-4xl text-body text-muted-foreground">
            You can declare other sources of income on the{" "}
            <span className="text-sky-500">Paid add ons</span> section
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeTaxReturnIncomeStep;
