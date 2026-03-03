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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodOption {
  value: string; // e.g. "2026-Q2" | "2026-04"
  label: string; // e.g. "Q2 2026 · Apr – Jun"
  sublabel?: string;
  group: "quarter" | "month";
}

// ─── Period Generation ────────────────────────────────────────────────────────

const QUARTER_MONTHS: Record<number, { abbr: string; label: string }> = {
  1: { abbr: "Jan – Mar", label: "Q1" },
  2: { abbr: "Apr – Jun", label: "Q2" },
  3: { abbr: "Jul – Sep", label: "Q3" },
  4: { abbr: "Oct – Dec", label: "Q4" },
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function generateOptionsForYear(year: number): PeriodOption[] {
  const quarters: PeriodOption[] = [1, 2, 3, 4].map((q) => ({
    value: `${year}-Q${q}`,
    label: `Q${q} ${year}`,
    sublabel: QUARTER_MONTHS[q].abbr,
    group: "quarter",
  }));

  const months: PeriodOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: `${year}-${String(i + 1).padStart(2, "0")}`,
    label: `${MONTH_NAMES[i]} ${year}`,
    sublabel: `${year}-${String(i + 1).padStart(2, "0")}`,
    group: "month",
  }));

  return [...quarters, ...months];
}

/** Derive a human label from a raw periodKey like "2026-Q2" or "2026-04" */
export function periodKeyToLabel(key: string): string {
  if (!key) {return "";}
  // Quarter: 2026-Q2
  const qMatch = key.match(/^(\d{4})-Q(\d)$/);
  if (qMatch) {
    const [, year, q] = qMatch;
    const qi = Number(q);
    return `Q${qi} ${year} · ${QUARTER_MONTHS[qi]?.abbr ?? ""}`;
  }
  // Month: 2026-04
  const mMatch = key.match(/^(\d{4})-(\d{2})$/);
  if (mMatch) {
    const [, year, month] = mMatch;
    const idx = Number(month) - 1;
    return `${MONTH_NAMES[idx] ?? month} ${year}`;
  }
  return key;
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
  placeholder = "Select or type a period…",
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Derive year from value or prop
  const effectiveYear = React.useMemo(() => {
    if (year) {return year;}
    const match = value?.match(/^(\d{4})/);
    if (match) {return Number(match[1]);}
    return new Date().getFullYear();
  }, [year, value]);

  const options = React.useMemo(() => generateOptionsForYear(effectiveYear), [effectiveYear]);

  const quarters = options.filter((o) => o.group === "quarter");
  const months = options.filter((o) => o.group === "month");

  // Filter by input
  const filtered = React.useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) {return options;}
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
              <span>{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type period…"
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
                  <span className="text-sm font-medium">Use "{inputValue.trim()}"</span>
                  <span className="text-xs text-muted-foreground">
                    Press Enter or click to use this custom period
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground px-4">No periods found.</span>
              )}
            </CommandEmpty>

            {/* Custom period typed by user that matches format */}
            {typedIsCustom && (
              <>
                <CommandGroup heading="Custom">
                  <CommandItem
                    value={inputValue.trim()}
                    onSelect={handleCustomSelect}
                    className="flex items-center gap-2"
                  >
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{inputValue.trim()}</span>
                      <span className="text-xs text-muted-foreground">Custom period</span>
                    </span>
                    {value === inputValue.trim() && <Check className="ml-auto h-4 w-4 shrink-0" />}
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Quarters */}
            {filteredQuarters.length > 0 && (
              <CommandGroup heading="Quarters">
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
              <CommandGroup heading="Monthly">
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
              Type <kbd className="font-mono bg-muted px-1 rounded text-[10px]">2026-Q2</kbd> or{" "}
              <kbd className="font-mono bg-muted px-1 rounded text-[10px]">2026-04</kbd> for a
              custom period
            </p>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
