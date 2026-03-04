import * as React from "react";
import { Check, ChevronsUpDown, CalendarDays } from "lucide-react";
import { cn } from "@corely/ui";
import { Button } from "@corely/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodOption {
  value: string; // e.g. "2026-Q2" | "2026-04"
  label: string; // e.g. "Q2 2026 · Apr – Jun"
  sublabel?: string;
  group: "quarter" | "month";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PeriodComboboxProps {
  value: string;
  onChange: (value: string) => void;
  year?: number; // drive which year's options to show
  disabled?: boolean;
  placeholder?: string;
}

export const PeriodCombobox: React.FC<PeriodComboboxProps> = ({
  value,
  onChange,
  year,
  disabled = false,
  placeholder,
}) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  const MONTH_NAMES = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { month: "long" });
    return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2026, i, 1)));
  }, [locale]);

  const QUARTER_MONTHS = React.useMemo(() => {
    return {
      1: {
        abbr: t("tax.periodCombobox.quarterMonths.1"),
        label: t("tax.periodCombobox.quarters.1"),
      },
      2: {
        abbr: t("tax.periodCombobox.quarterMonths.2"),
        label: t("tax.periodCombobox.quarters.2"),
      },
      3: {
        abbr: t("tax.periodCombobox.quarterMonths.3"),
        label: t("tax.periodCombobox.quarters.3"),
      },
      4: {
        abbr: t("tax.periodCombobox.quarterMonths.4"),
        label: t("tax.periodCombobox.quarters.4"),
      },
    } as Record<number, { abbr: string; label: string }>;
  }, [t]);

  const periodKeyToLabel = React.useCallback(
    (key: string): string => {
      if (!key) {
        return "";
      }
      // Quarter: 2026-Q2
      const qMatch = key.match(/^(\d{4})-Q(\d)$/);
      if (qMatch) {
        const [, year, q] = qMatch;
        const qi = Number(q);
        const qLabel = QUARTER_MONTHS[qi]?.label ?? `Q${qi}`;
        const qAbbr = QUARTER_MONTHS[qi]?.abbr ?? "";
        return `${qLabel} ${year} · ${qAbbr}`;
      }
      // Month: 2026-04
      const mMatch = key.match(/^(\d{4})-(\d{2})$/);
      if (mMatch) {
        const [, year, month] = mMatch;
        const idx = Number(month) - 1;
        return `${MONTH_NAMES[idx] ?? month} ${year}`;
      }
      return key;
    },
    [MONTH_NAMES, QUARTER_MONTHS]
  );

  const generateOptionsForYear = React.useCallback(
    (targetYear: number): PeriodOption[] => {
      const quarters: PeriodOption[] = [1, 2, 3, 4].map((q) => ({
        value: `${targetYear}-Q${q}`,
        label: `${QUARTER_MONTHS[q].label} ${targetYear}`,
        sublabel: QUARTER_MONTHS[q].abbr,
        group: "quarter",
      }));

      const months: PeriodOption[] = Array.from({ length: 12 }, (_, i) => ({
        value: `${targetYear}-${String(i + 1).padStart(2, "0")}`,
        label: `${MONTH_NAMES[i]} ${targetYear}`,
        sublabel: `${targetYear}-${String(i + 1).padStart(2, "0")}`,
        group: "month",
      }));

      return [...quarters, ...months];
    },
    [MONTH_NAMES, QUARTER_MONTHS]
  );

  // Derive year from value or prop
  const effectiveYear = React.useMemo(() => {
    if (year) {
      return year;
    }
    const match = value?.match(/^(\d{4})/);
    if (match) {
      return Number(match[1]);
    }
    return new Date().getFullYear();
  }, [year, value]);

  const options = React.useMemo(
    () => generateOptionsForYear(effectiveYear),
    [generateOptionsForYear, effectiveYear]
  );

  // Filter by input
  const filtered = React.useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) {
      return options;
    }
    return options.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q) ||
        (o.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [inputValue, options]);

  const filteredQuarters = filtered.filter((o) => o.group === "quarter");
  const filteredMonths = filtered.filter((o) => o.group === "month");

  // Is the typed value a valid custom period (not in list)?
  const typedIsCustom =
    inputValue.trim().length > 0 && !options.some((o) => o.value === inputValue.trim());

  const displayLabel = value ? periodKeyToLabel(value) : "";

  const handleSelect = (selected: string) => {
    onChange(selected === value ? "" : selected);
    setInputValue("");
    setOpen(false);
  };

  const handleCustomSelect = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onChange(trimmed);
      setInputValue("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? (
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm font-medium">{displayLabel}</span>
                <span className="text-xs text-muted-foreground">{value}</span>
              </span>
            ) : (
              <span>{placeholder ?? t("tax.periodCombobox.placeholder")}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("tax.periodCombobox.searchPlaceholder")}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                <div
                  className="flex flex-col items-center gap-1 py-4 cursor-pointer hover:bg-accent rounded-sm px-4"
                  onClick={handleCustomSelect}
                >
                  <span className="text-sm font-medium">
                    {t("tax.periodCombobox.useCustom", { value: inputValue.trim() })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("tax.periodCombobox.customHint")}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground px-4">
                  {t("tax.periodCombobox.noPeriods")}
                </span>
              )}
            </CommandEmpty>

            {/* Custom period typed by user that matches format */}
            {typedIsCustom && (
              <>
                <CommandGroup heading={t("tax.periodCombobox.customHeading")}>
                  <CommandItem
                    value={inputValue.trim()}
                    onSelect={handleCustomSelect}
                    className="flex items-center gap-2"
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{inputValue.trim()}</span>
                      <span className="text-xs text-muted-foreground">
                        {t("tax.periodCombobox.customPeriod")}
                      </span>
                    </span>
                    {value === inputValue.trim() && <Check className="ml-auto h-4 w-4 shrink-0" />}
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Quarters */}
            {filteredQuarters.length > 0 && (
              <CommandGroup heading={t("tax.periodCombobox.quartersHeading")}>
                {filteredQuarters.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.sublabel}</span>
                    </span>
                    {value === opt.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredQuarters.length > 0 && filteredMonths.length > 0 && <CommandSeparator />}

            {/* Monthly */}
            {filteredMonths.length > 0 && (
              <CommandGroup heading={t("tax.periodCombobox.monthlyHeading")}>
                {filteredMonths.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {opt.sublabel}
                      </span>
                    </span>
                    {value === opt.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer hint */}
          <div className="border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t("tax.periodCombobox.footerHint", {
                qExample: (
                  <kbd className="font-mono bg-muted px-1 rounded text-[10px]">2026-Q2</kbd>
                ),
                mExample: (
                  <kbd className="font-mono bg-muted px-1 rounded text-[10px]">2026-04</kbd>
                ),
              })}
            </p>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
