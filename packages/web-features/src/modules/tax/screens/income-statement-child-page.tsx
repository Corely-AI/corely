import React from "react";
import { useMutation } from "@tanstack/react-query";
import type { ChildEntry, ChildrenSectionPayload } from "@corely/contracts";
import { createDefaultChildrenSectionPayload } from "@corely/contracts";
import { ArrowLeft } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { taxReportApi } from "@corely/web-shared/lib/tax-report-api";
import { useNavigate, useParams } from "react-router-dom";
import type { BinaryChoice } from "./income-tax-return-shared";
import { SegmentedControl, sanitizeTaxId } from "./income-tax-return-shared";
import {
  ChildCostDialog,
  ChildPageSection,
  CostTableSection,
  DatePickerField,
  FieldGroup,
  MoneyInput,
  RELATIONSHIP_OPTIONS,
  UnsupportedChildDeclarationAlert,
  type ChildCareCost,
  type ChildResidenceValue,
  type PrivateSchoolCost,
  type RelationshipValue,
  type SharedHouseholdValue,
} from "./income-statement-child-shared";
import { useIncomeAnnualReportContext } from "../hooks/useIncomeAnnualReportContext";
import { useTaxReportSection } from "../hooks/useTaxReportSection";
import { formatLocalDate } from "./tax-date";

export const IncomeStatementChildPage = () => {
  const navigate = useNavigate();
  const params = useParams<{ year: string }>();
  const year = Number(params.year);
  const isValidYear = Number.isFinite(year) && year >= 2000;
  const reportContextQuery = useIncomeAnnualReportContext(year);
  const reportContext = reportContextQuery.data;
  const childrenSection = useTaxReportSection({
    filingId: reportContext?.filingId ?? "",
    reportId: reportContext?.reportId ?? "",
    sectionKey: "children",
    defaultValue: React.useMemo(() => createDefaultChildrenSectionPayload(), []),
    enabled: Boolean(reportContext) && isValidYear,
  });

  const [taxId, setTaxId] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState<Date | undefined>();
  const [yourRelationship, setYourRelationship] = React.useState<RelationshipValue | undefined>();
  const [spouseRelationship, setSpouseRelationship] = React.useState<
    RelationshipValue | undefined
  >();
  const [otherParentName, setOtherParentName] = React.useState("");
  const [otherParentAddress, setOtherParentAddress] = React.useState("");
  const [sharedHousehold, setSharedHousehold] =
    React.useState<SharedHouseholdValue>("yes-entire-year");
  const [childResidence, setChildResidence] = React.useState<ChildResidenceValue>("with-me");
  const [livedInGermany, setLivedInGermany] = React.useState<BinaryChoice>("yes");
  const [receivesChildBenefit, setReceivesChildBenefit] = React.useState<BinaryChoice>("yes");
  const [familyOfficeBranch, setFamilyOfficeBranch] = React.useState("");
  const [hasChildPrivateHealthInsurance, setHasChildPrivateHealthInsurance] =
    React.useState<BinaryChoice>("yes");
  const [childHealthBasicCoverage, setChildHealthBasicCoverage] = React.useState("€ 0");
  const [childHealthMandatoryNursing, setChildHealthMandatoryNursing] = React.useState("€ 0");
  const [childHealthReimbursed, setChildHealthReimbursed] = React.useState("€ 0");
  const [childHealthAdditional, setChildHealthAdditional] = React.useState("€ 0");

  const [childCareCosts, setChildCareCosts] = React.useState<ChildCareCost[]>([]);
  const [privateSchoolCosts, setPrivateSchoolCosts] = React.useState<PrivateSchoolCost[]>([]);
  const [childCareDialogOpen, setChildCareDialogOpen] = React.useState(false);
  const [privateSchoolDialogOpen, setPrivateSchoolDialogOpen] = React.useState(false);

  const [childCareDescription, setChildCareDescription] = React.useState("");
  const [childCareProvider, setChildCareProvider] = React.useState("");
  const [childCareStartDate, setChildCareStartDate] = React.useState<Date | undefined>();
  const [childCareEndDate, setChildCareEndDate] = React.useState<Date | undefined>();
  const [childCareTotalCost, setChildCareTotalCost] = React.useState("€ 0");

  const [privateSchoolName, setPrivateSchoolName] = React.useState("");
  const [privateSchoolAddress, setPrivateSchoolAddress] = React.useState("");
  const [privateSchoolStartDate, setPrivateSchoolStartDate] = React.useState<Date | undefined>();
  const [privateSchoolEndDate, setPrivateSchoolEndDate] = React.useState<Date | undefined>();
  const [privateSchoolTotalCost, setPrivateSchoolTotalCost] = React.useState("€ 0");

  const resetChildCareForm = () => {
    setChildCareDescription("");
    setChildCareProvider("");
    setChildCareStartDate(undefined);
    setChildCareEndDate(undefined);
    setChildCareTotalCost("€ 0");
  };

  const resetPrivateSchoolForm = () => {
    setPrivateSchoolName("");
    setPrivateSchoolAddress("");
    setPrivateSchoolStartDate(undefined);
    setPrivateSchoolEndDate(undefined);
    setPrivateSchoolTotalCost("€ 0");
  };

  const handleSaveChildCareCost = () => {
    setChildCareCosts((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        service: childCareDescription || "Childcare service",
        provider: childCareProvider,
        startDate: formatLocalDate(childCareStartDate),
        endDate: formatLocalDate(childCareEndDate),
        amount: childCareTotalCost || "€ 0",
      },
    ]);
    setChildCareDialogOpen(false);
    resetChildCareForm();
  };

  const handleSavePrivateSchoolCost = () => {
    setPrivateSchoolCosts((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        schoolName: privateSchoolName || "Private school",
        schoolAddress: privateSchoolAddress,
        startDate: formatLocalDate(privateSchoolStartDate),
        endDate: formatLocalDate(privateSchoolEndDate),
        amount: privateSchoolTotalCost || "€ 0",
      },
    ]);
    setPrivateSchoolDialogOpen(false);
    resetPrivateSchoolForm();
  };

  const saveMutation = useMutation({
    mutationFn: async (nextPayload: ChildrenSectionPayload) => {
      if (!reportContext) {
        throw new Error("Missing income tax report context");
      }

      return taxReportApi.upsertSection(
        reportContext.filingId,
        reportContext.reportId,
        "children",
        {
          payload: nextPayload,
        }
      );
    },
    onSuccess: () => {
      void childrenSection.refetch();
      navigate(-1);
    },
  });

  const handleSave = async () => {
    if (!reportContext) {
      return;
    }

    const entry: ChildEntry = {
      id: `child-${Date.now()}`,
      year,
      taxId,
      firstName,
      lastName,
      birthDate: formatLocalDate(birthDate),
      yourRelationship: yourRelationship ?? "",
      spouseRelationship: spouseRelationship ?? "",
      otherParentName,
      otherParentAddress,
      sharedHousehold,
      childResidence,
      livedInGermany,
      receivesChildBenefit,
      familyOfficeBranch,
      hasChildPrivateHealthInsurance,
      childHealthBasicCoverage,
      childHealthMandatoryNursing,
      childHealthReimbursed,
      childHealthAdditional,
      childCareCosts,
      privateSchoolCosts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextEntries = [...childrenSection.value.entries, entry];
    await saveMutation.mutateAsync({ entries: nextEntries });
  };

  if (!isValidYear) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-6 lg:p-8">
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 px-0 text-base text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="space-y-4 border-b border-border/60 pb-4">
          <h1 className="text-4xl font-semibold leading-tight text-foreground">Add child</h1>
          <p className="text-sm text-muted-foreground">Tax year: {year}</p>
          {!reportContext && !reportContextQuery.isLoading ? (
            <p className="text-sm text-rose-600">No income tax report found for {year}.</p>
          ) : null}
        </div>
      </div>

      <ChildPageSection title="Child personal details">
        <FieldGroup
          id="child-tax-id"
          label="Tax ID"
          helperText="11 digits personal tax id, also known as Identifikationsnummer"
        >
          <Input
            id="child-tax-id"
            value={taxId}
            onChange={(event) => setTaxId(sanitizeTaxId(event.target.value))}
            placeholder="e.g. 12 345 678 901"
            className="h-10"
          />
        </FieldGroup>

        <FieldGroup id="child-first-name" label="First name">
          <Input
            id="child-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="h-10"
          />
        </FieldGroup>

        <FieldGroup id="child-last-name" label="Last name">
          <Input
            id="child-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="h-10"
          />
        </FieldGroup>

        <FieldGroup id="child-birth-date" label="Birth date">
          <DatePickerField id="child-birth-date" value={birthDate} onChange={setBirthDate} />
        </FieldGroup>
      </ChildPageSection>

      <ChildPageSection title="Parent-child relationship">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup id="your-relationship" label="What is your relationship with the child?">
            <Select
              value={yourRelationship}
              onValueChange={(next) => setYourRelationship(next as RelationshipValue)}
            >
              <SelectTrigger id="your-relationship" className="h-10">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup
            id="spouse-relationship"
            label="What is your spouse's relationship with the child?"
          >
            <Select
              value={spouseRelationship}
              onValueChange={(next) => setSpouseRelationship(next as RelationshipValue)}
            >
              <SelectTrigger id="spouse-relationship" className="h-10">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup id="other-parent-name" label="Name and surname of the other parent">
            <Input
              id="other-parent-name"
              value={otherParentName}
              onChange={(event) => setOtherParentName(event.target.value)}
              className="h-10"
            />
          </FieldGroup>

          <FieldGroup id="other-parent-address" label="Last known address of the other parent">
            <Input
              id="other-parent-address"
              value={otherParentAddress}
              onChange={(event) => setOtherParentAddress(event.target.value)}
              className="h-10"
            />
          </FieldGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Did you and the other parent share a common household for the entire year?
          </Label>
          <SegmentedControl
            ariaLabel="Common household"
            value={sharedHousehold}
            onChange={(next) => setSharedHousehold(next as SharedHouseholdValue)}
            options={[
              { value: "yes-entire-year", label: "Yes, for the entire year" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Has the child lived with you for the entire year?
          </Label>
          <SegmentedControl
            ariaLabel="Child residence"
            value={childResidence}
            onChange={(next) => setChildResidence(next as ChildResidenceValue)}
            options={[
              { value: "with-me", label: "Yes, with me" },
              { value: "with-other-parent", label: "No, with the other parent" },
              { value: "somewhere-else", label: "No, somewhere else" },
            ]}
          />
        </div>

        {childResidence === "somewhere-else" ? <UnsupportedChildDeclarationAlert /> : null}

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Has the child lived in germany for the entire year?
          </Label>
          <SegmentedControl
            ariaLabel="Child lived in Germany"
            value={livedInGermany}
            onChange={(next) => setLivedInGermany(next as BinaryChoice)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        {livedInGermany === "no" ? <UnsupportedChildDeclarationAlert /> : null}
      </ChildPageSection>

      <ChildPageSection title="Child benefits">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Are you entitled to receive child benefit?
          </Label>
          <SegmentedControl
            ariaLabel="Child benefit eligibility"
            value={receivesChildBenefit}
            onChange={(next) => setReceivesChildBenefit(next as BinaryChoice)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        {receivesChildBenefit === "yes" ? (
          <FieldGroup
            id="family-office-branch"
            label="Your local Family Office branch at the Employment department (Familienkasse beim Arbeitsamt)"
            helperText="The name of the branch should be on the letters you receive about Kindergeld"
          >
            <Input
              id="family-office-branch"
              value={familyOfficeBranch}
              onChange={(event) => setFamilyOfficeBranch(event.target.value)}
              placeholder="e.g Familienkasse Berlin - Brandenburg"
              className="h-10"
            />
          </FieldGroup>
        ) : null}
      </ChildPageSection>

      <ChildPageSection
        title="Childcare costs (including Nurseries, Kindergartens, Nannies, Pre-school / After school)"
        description="For children under the age of 14. Two-thirds of the costs will be deducted with a limit of €4000"
      >
        <CostTableSection
          label="Child care costs"
          actionLabel="Add child care cost"
          emptyLabel="No child care costs added yet."
          firstColumnLabel="Service"
          rows={childCareCosts}
          getRowKey={(row) => (row as ChildCareCost).id}
          getPrimaryValue={(row) => (row as ChildCareCost).service}
          getSecondaryValue={(row) => (row as ChildCareCost).amount}
          onAdd={() => setChildCareDialogOpen(true)}
        />
      </ChildPageSection>

      <ChildPageSection
        title="Private school costs"
        description="30% of the costs will be deducted with a limit of €5000"
      >
        <CostTableSection
          label="Private school costs"
          actionLabel="Add private school cost"
          emptyLabel="No private school costs added yet."
          firstColumnLabel="Name of school"
          rows={privateSchoolCosts}
          getRowKey={(row) => (row as PrivateSchoolCost).id}
          getPrimaryValue={(row) => (row as PrivateSchoolCost).schoolName}
          getSecondaryValue={(row) => (row as PrivateSchoolCost).amount}
          onAdd={() => setPrivateSchoolDialogOpen(true)}
        />
      </ChildPageSection>

      <ChildPageSection title="Contribution to private health insurance">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Do you have private health insurance for your child?
          </Label>
          <SegmentedControl
            ariaLabel="Child private health insurance"
            value={hasChildPrivateHealthInsurance}
            onChange={(next) => setHasChildPrivateHealthInsurance(next as BinaryChoice)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        {hasChildPrivateHealthInsurance === "yes" ? (
          <div className="space-y-6">
            <FieldGroup
              id="child-private-basic-coverage"
              label="Basic coverage contributions for the child's health insurance"
              helperText={
                <span>
                  Learn more about{" "}
                  <button type="button" className="text-sky-500 hover:text-sky-400">
                    basic coverage contributions
                  </button>
                </span>
              }
            >
              <MoneyInput
                id="child-private-basic-coverage"
                value={childHealthBasicCoverage}
                onChange={setChildHealthBasicCoverage}
              />
            </FieldGroup>

            <FieldGroup
              id="child-private-mandatory-nursing"
              label="Contributions to mandatory nursing insurances (Pflege-Pflichtversicherung) (Optional)"
            >
              <MoneyInput
                id="child-private-mandatory-nursing"
                value={childHealthMandatoryNursing}
                onChange={setChildHealthMandatoryNursing}
              />
            </FieldGroup>

            <FieldGroup id="child-private-reimbursed" label="Reimbursed Contributions (Optional)">
              <MoneyInput
                id="child-private-reimbursed"
                value={childHealthReimbursed}
                onChange={setChildHealthReimbursed}
              />
            </FieldGroup>

            <FieldGroup
              id="child-private-additional"
              label="Contributions to optional services and additional insurance (Optional)"
            >
              <MoneyInput
                id="child-private-additional"
                value={childHealthAdditional}
                onChange={setChildHealthAdditional}
              />
            </FieldGroup>
          </div>
        ) : null}
      </ChildPageSection>

      <div className="sr-only" aria-live="polite">
        {saveMutation.isPending ? "Saving child details" : null}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          className="rounded-full px-8"
          onClick={() => void handleSave()}
          disabled={!reportContext || saveMutation.isPending}
        >
          Save
        </Button>
      </div>

      <ChildCostDialog
        open={childCareDialogOpen}
        onOpenChange={(open) => {
          setChildCareDialogOpen(open);
          if (!open) {
            resetChildCareForm();
          }
        }}
        title="Add child care cost"
        primaryLabel="Description of the service in German"
        primaryPlaceholder="e.g. Kita"
        secondaryLabel="Name and address of service provider"
        secondaryPlaceholder="e.g. Kita Regenbogen, Rosa-Luxemburg-Strasse, Berlin"
        totalLabel="Total cost for childcare"
        totalValue={childCareTotalCost}
        primaryValue={childCareDescription}
        secondaryValue={childCareProvider}
        startDate={childCareStartDate}
        endDate={childCareEndDate}
        onPrimaryChange={setChildCareDescription}
        onSecondaryChange={setChildCareProvider}
        onStartDateChange={setChildCareStartDate}
        onEndDateChange={setChildCareEndDate}
        onTotalValueChange={setChildCareTotalCost}
        onSave={handleSaveChildCareCost}
      />

      <ChildCostDialog
        open={privateSchoolDialogOpen}
        onOpenChange={(open) => {
          setPrivateSchoolDialogOpen(open);
          if (!open) {
            resetPrivateSchoolForm();
          }
        }}
        title="Add private school cost"
        primaryLabel="Name of school"
        primaryPlaceholder="e.g. Freie Schule Berlin"
        secondaryLabel="Address of school"
        secondaryPlaceholder="e.g. Musterstrasse 12, Berlin"
        totalLabel="Total private school cost"
        totalValue={privateSchoolTotalCost}
        primaryValue={privateSchoolName}
        secondaryValue={privateSchoolAddress}
        startDate={privateSchoolStartDate}
        endDate={privateSchoolEndDate}
        onPrimaryChange={setPrivateSchoolName}
        onSecondaryChange={setPrivateSchoolAddress}
        onStartDateChange={setPrivateSchoolStartDate}
        onEndDateChange={setPrivateSchoolEndDate}
        onTotalValueChange={setPrivateSchoolTotalCost}
        onSave={handleSavePrivateSchoolCost}
      />
    </div>
  );
};

export default IncomeStatementChildPage;
