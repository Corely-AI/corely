import React from "react";
import { AlertCircle, Check } from "lucide-react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@corely/ui";

export type DeclarationType = "joint" | "individual";
export type Gender = "female" | "male";
export type HomeAddressChoice = "yes" | "no";
export type BinaryChoice = "yes" | "no";

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

// Tax-relevant religious affiliations based on the official ELSTER Kirchensteuer keys.
export const RELIGION_OPTIONS = [
  { label: "No religion / not liable to church tax", value: "--" },
  { label: "Altkatholisch", value: "ak" },
  { label: "Evangelisch", value: "ev" },
  { label: "Freie Religionsgemeinschaft Alzey", value: "fa" },
  { label: "Freireligioese Landesgemeinde Baden", value: "fb" },
  { label: "Freireligioese Landesgemeinde Pfalz", value: "fg" },
  { label: "Freireligioese Gemeinde Mainz", value: "fm" },
  { label: "Franzoesisch reformiert", value: "fr" },
  { label: "Freireligioese Gemeinde Offenbach/Main", value: "fs" },
  { label: "Israelitische Religionsgemeinschaft Baden", value: "ib" },
  { label: "Juedische Kultussteuer (Schleswig-Holstein)", value: "ih" },
  { label: "Israelitische Kultussteuer der Gemeinden Hessen", value: "il" },
  {
    label:
      "Israelitische/Juedische Kultussteuer (Bayern, Brandenburg, Frankfurt, Rheinland-Pfalz, Saarland)",
    value: "is",
  },
  { label: "Israelitische Religionsgemeinschaft Wuerttembergs", value: "iw" },
  { label: "Juedische Kultussteuer (Nordrhein-Westfalen / Brandenburg)", value: "jd" },
  { label: "Juedische Kultussteuer (Hamburg)", value: "jh" },
  { label: "Neuapostolisch", value: "na" },
  { label: "Evangelisch lutherisch", value: "lt" },
  { label: "Evangelisch reformiert", value: "rf" },
  { label: "Roemisch-Katholisch", value: "rk" },
] as const;

export type ReligionValue = (typeof RELIGION_OPTIONS)[number]["value"];

export const GERMAN_STATE_OPTIONS = [
  { value: "baden-wuerttemberg", label: "Baden-Wuerttemberg" },
  { value: "bavaria", label: "Bavaria" },
  { value: "berlin", label: "Berlin" },
  { value: "brandenburg", label: "Brandenburg" },
  { value: "bremen", label: "Bremen" },
  { value: "hamburg", label: "Hamburg" },
  { value: "hesse", label: "Hesse" },
  { value: "lower-saxony", label: "Lower Saxony" },
  { value: "mecklenburg-vorpommern", label: "Mecklenburg-Vorpommern" },
  { value: "north-rhine-westphalia", label: "North Rhine-Westphalia" },
  { value: "rhineland-palatinate", label: "Rhineland-Palatinate" },
  { value: "saarland", label: "Saarland" },
  { value: "saxony", label: "Saxony" },
  { value: "saxony-anhalt", label: "Saxony-Anhalt" },
  { value: "schleswig-holstein", label: "Schleswig-Holstein" },
  { value: "thuringia", label: "Thuringia" },
] as const;

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
    className="flex w-full max-w-full overflow-hidden rounded-md border border-sky-500 sm:w-fit"
    role="group"
    aria-label={ariaLabel}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        className={cn(
          "min-w-0 flex-1 px-4 py-2 text-center text-sm font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10 sm:flex-none",
          option.value === value ? "bg-sky-500 text-white" : "bg-card text-sky-600 hover:bg-sky-50"
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

type ReligionSelectProps = {
  id: string;
  value?: ReligionValue;
  onValueChange: (next: ReligionValue) => void;
};

export const ReligionSelect = ({ id, value, onValueChange }: ReligionSelectProps) => (
  <Select value={value} onValueChange={(next) => onValueChange(next as ReligionValue)}>
    <SelectTrigger id={id} className="h-10">
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      {RELIGION_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

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
