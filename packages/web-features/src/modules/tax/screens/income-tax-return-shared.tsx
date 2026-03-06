import React from "react";
import { AlertCircle, Check } from "lucide-react";
import { Input, Label, cn } from "@corely/ui";

export type DeclarationType = "joint" | "individual";
export type Gender = "female" | "male";
export type HomeAddressChoice = "yes" | "no";
export type BinaryChoice = "yes" | "no";
export type ReligionValue =
  | "not-subject-church-tax"
  | "roman-catholic"
  | "protestant"
  | "jewish-community"
  | "other";

export type WizardStepKey =
  | "personal-details"
  | "income"
  | "health-insurance"
  | "other-insurances"
  | "additional-expenses"
  | "info-for-tax-office"
  | "paid-add-ons"
  | "review-and-submit";

export type TaxWizardStep = {
  key: WizardStepKey;
  label: string;
  step: number;
  done?: boolean;
};

export const TAX_WIZARD_STEPS: TaxWizardStep[] = [
  { key: "personal-details", step: 1, label: "Personal details", done: true },
  { key: "income", step: 2, label: "Income" },
  { key: "health-insurance", step: 3, label: "Health insurance" },
  { key: "other-insurances", step: 4, label: "Other insurances" },
  { key: "additional-expenses", step: 5, label: "Additional expenses", done: true },
  { key: "info-for-tax-office", step: 6, label: "Info for the tax office" },
  { key: "paid-add-ons", step: 7, label: "Paid add ons", done: true },
  { key: "review-and-submit", step: 8, label: "Review and submit" },
];

export const RELIGION_OPTIONS: ReadonlyArray<{ label: string; value: ReligionValue }> = [
  { label: "Not subject to church tax", value: "not-subject-church-tax" },
  { label: "Roman Catholic", value: "roman-catholic" },
  { label: "Protestant", value: "protestant" },
  { label: "Jewish Community", value: "jewish-community" },
  { label: "Other", value: "other" },
];

export const MAX_PROFESSION_LENGTH = 25;

export type StepCircleProps = {
  done: boolean;
  step: number;
  active: boolean;
};

export const StepCircle = ({ done, step, active }: StepCircleProps) => (
  <div
    className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
      done
        ? "border-sky-500 text-sky-500"
        : active
          ? "border-sky-500 text-sky-500"
          : "border-rose-300 text-rose-400"
    )}
    aria-hidden="true"
  >
    {done ? <Check className="h-4 w-4" /> : step}
  </div>
);

export const sanitizeNumeric = (value: string, maxLength: number) =>
  value.replace(/[^0-9]/g, "").slice(0, maxLength);

export const sanitizeTaxId = (value: string) => value.replace(/[^0-9 ]/g, "").slice(0, 14);

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (next: T) => void;
};

export const SegmentedControl = <T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) => (
  <div
    className="inline-flex overflow-hidden rounded-md border border-sky-500"
    role="group"
    aria-label={ariaLabel}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={cn(
          "h-10 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          option.value === value ? "bg-card text-sky-600" : "bg-sky-500 text-white hover:bg-sky-600"
        )}
        aria-pressed={option.value === value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const RequiredHint = ({ show }: { show: boolean }) => {
  if (!show) {
    return null;
  }

  return (
    <p className="flex items-center gap-1 text-xs text-rose-500">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      Required
    </p>
  );
};

type OptionalMoneyFieldProps = {
  id: string;
  label: string;
  helperText: string;
  value: string;
  onChange: (next: string) => void;
};

export const OptionalMoneyField = ({
  id,
  label,
  helperText,
  value,
  onChange,
}: OptionalMoneyFieldProps) => (
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
    <p className="text-xs text-muted-foreground">{helperText}</p>
  </div>
);
