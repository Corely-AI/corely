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

const languages = [
  { locale: "en", label: "English" },
  { locale: "de", label: "Deutsch" },
  { locale: "vi", label: "Tiếng Việt" },
] as const;

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
  const label = locale === "de" ? "Sprache" : locale === "vi" ? "Ngôn ngữ" : "Language";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={className ?? "min-h-11 min-w-11 gap-2"}
          aria-label={label}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            <Globe className="h-4 w-4" />
          </span>
          {!compact && <span>{locale.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((entry) => (
          <DropdownMenuItem
            key={entry.locale}
            className="min-h-11 gap-2"
            onSelect={() => onChange(entry.locale)}
          >
            <span lang={entry.locale}>{entry.label}</span>
            {entry.locale === locale && <Check aria-hidden="true" className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
