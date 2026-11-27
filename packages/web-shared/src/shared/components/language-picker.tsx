import { corelyLocaleDetails, corelyLocales } from "@corely/contracts";
import React from "react";
import { Globe, Check } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@corely/ui";
import type { FocusedLocale } from "../../session/focused-locale";

/** Controlled language control shared by the catalog and existing application shells. */
export function LanguagePicker({
  locale,
  onChange,
  className,
  compact = false,
}: {
  locale: FocusedLocale;
  onChange: (locale: FocusedLocale) => void;
  className?: string;
  compact?: boolean;
}) {
  const label = corelyLocaleDetails[locale].label;
  const languageCode = locale.toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={className ?? "min-h-11 min-w-11 gap-2"}
          aria-label={compact ? label : `${languageCode} ${label}`}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            <Globe className="h-4 w-4" />
          </span>
          {!compact && <span>{languageCode}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[60vh] w-52 overflow-y-auto">
        {corelyLocales.map((entry) => (
          <DropdownMenuItem key={entry} className="min-h-11 gap-2" onSelect={() => onChange(entry)}>
            <span lang={entry}>{corelyLocaleDetails[entry].name}</span>
            {entry === locale && <Check aria-hidden="true" className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
