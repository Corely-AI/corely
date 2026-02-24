import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "./button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./command";
import { cn } from "./lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Australia/Sydney",
] as const;

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

type TimezoneOption = {
  value: string;
  label: string;
  search: string;
};

let cachedTimezones: string[] | null = null;

const normalizeOffsetLabel = (value: string): string => {
  if (value === "GMT" || value === "UTC") {
    return "GMT+00:00";
  }

  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return value.replace("UTC", "GMT");
  }

  const [, sign, hourRaw, minuteRaw] = match;
  const hour = hourRaw.padStart(2, "0");
  const minute = (minuteRaw ?? "00").padStart(2, "0");
  return `GMT${sign}${hour}:${minute}`;
};

const getOffsetLabel = (timezone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    return normalizeOffsetLabel(offset);
  } catch {
    return "GMT+00:00";
  }
};

const formatTimezoneName = (timezone: string): string =>
  timezone.replace(/_/g, " ").replace(/\//g, " / ");

const getTimezones = (): string[] => {
  if (cachedTimezones) {
    return cachedTimezones;
  }

  const intl = Intl as IntlWithSupportedValuesOf;
  const supported =
    typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : [];
  cachedTimezones = Array.from(new Set([...supported, ...FALLBACK_TIMEZONES])).sort((a, b) =>
    a.localeCompare(b)
  );
  return cachedTimezones;
};

const buildOptions = (currentValue: string | undefined): TimezoneOption[] => {
  const timezones = getTimezones();
  const values =
    currentValue && !timezones.includes(currentValue) ? [currentValue, ...timezones] : timezones;

  return values.map((timezone) => {
    const offset = getOffsetLabel(timezone);
    const displayName = formatTimezoneName(timezone);

    return {
      value: timezone,
      label: `${offset} ${displayName}`,
      search: `${timezone} ${displayName} ${offset}`.toLowerCase(),
    };
  });
};

export type TimezoneSelectProps = {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

export function TimezoneSelect({
  id,
  value,
  onChange,
  placeholder = "Select timezone",
  disabled,
  className,
  triggerClassName,
}: TimezoneSelectProps) {
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => buildOptions(value), [value]);
  const selected = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Timezone"
          className={cn("w-full justify-between font-normal", triggerClassName)}
          disabled={disabled}
          data-testid="timezone-select"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[var(--radix-popover-trigger-width)] p-0", className)}
      >
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.search}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="justify-between gap-2"
              >
                <span className="truncate">{option.label}</span>
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
