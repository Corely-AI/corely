import React, { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Input } from "@corely/ui";
import { Button } from "@corely/ui";
import { Plus } from "lucide-react";
import {
  DEFAULT_CURRENCY_CODES,
  normalizeCurrencyCode,
  isValidCurrencyCode,
  sortCurrencyCodes,
  getCurrencySymbol,
} from "@corely/web-shared/shared/lib/currency";

interface CurrencySelectProps {
  value?: string;
  onValueChange: (code: string) => void;
  currencies?: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  showSymbol?: boolean;
  locale?: string;
  allowCustom?: boolean;
  onCustomAdded?: (code: string) => void;
  persistCustomKey?: string;
}

const STORAGE_PREFIX = "corely.currency.custom.";

export function CurrencySelect({
  value,
  onValueChange,
  currencies,
  disabled = false,
  placeholder = "Select currency",
  showSymbol = true,
  locale,
  allowCustom = true,
  onCustomAdded,
  persistCustomKey,
}: CurrencySelectProps) {
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState("");
  const [customCodes, setCustomCodes] = useState<string[]>([]);

  // Load persisted custom currencies on mount
  useEffect(() => {
    if (!persistCustomKey) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + persistCustomKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validated = parsed.filter(isValidCurrencyCode);
          setCustomCodes(validated);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [persistCustomKey]);

  // Persist custom currencies when they change
  useEffect(() => {
    if (!persistCustomKey || customCodes.length === 0) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_PREFIX + persistCustomKey, JSON.stringify(customCodes));
    } catch {
      // Ignore storage errors
    }
  }, [customCodes, persistCustomKey]);

  const detectedLocale = useMemo(() => {
    return locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");
  }, [locale]);

  const options = useMemo(() => {
    const baseCodes = currencies ?? DEFAULT_CURRENCY_CODES;
    const allCodes = [...baseCodes, ...customCodes];

    // Include current value if not in list
    if (value && !allCodes.includes(value)) {
      allCodes.push(value);
    }

    return sortCurrencyCodes(allCodes);
  }, [currencies, customCodes, value]);

  const handleAddCustom = () => {
    const normalized = normalizeCurrencyCode(customInput);

    if (!normalized) {
      setCustomError("");
      return;
    }

    if (!isValidCurrencyCode(normalized)) {
      setCustomError("Must be 3 letters (e.g., SGD)");
      return;
    }

    if (options.includes(normalized)) {
      // Already exists, just select it
      onValueChange(normalized);
      setCustomInput("");
      setCustomError("");
      return;
    }

    // Add new custom currency
    setCustomCodes((prev) => [...prev, normalized]);
    onCustomAdded?.(normalized);
    onValueChange(normalized);
    setCustomInput("");
    setCustomError("");
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleAddCustom();
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowCustom && (
          <div
            className="p-2 border-b mb-1"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1">
              <Input
                placeholder="Add (e.g., SGD)"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setCustomError("");
                }}
                onKeyDown={handleCustomInputKeyDown}
                className="h-7 text-xs flex-1"
                disabled={disabled}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleAddCustom}
                disabled={disabled}
                type="button"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {customError && <p className="text-xs text-destructive mt-1">{customError}</p>}
          </div>
        )}
        {options.map((code) => {
          const symbol = showSymbol ? getCurrencySymbol(code, detectedLocale) : null;
          const label = showSymbol && symbol !== code ? `${code} (${symbol})` : code;

          return (
            <SelectItem key={code} value={code}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
