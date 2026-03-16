import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@corely/ui";

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector = ({ className }: LanguageSelectorProps) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    void i18n.changeLanguage(lang);
    localStorage.setItem("Corely One ERP-language", lang);
  };

  const currentLanguage = i18n.language || "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className ?? "text-muted-foreground hover:text-foreground"}
        >
          <span className="text-lg leading-none">
            {currentLanguage.startsWith("de")
              ? "🇩🇪"
              : currentLanguage.startsWith("vi")
                ? "🇻🇳"
                : "🇬🇧"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => changeLanguage("de")}>
          🇩🇪 {t("settings.languages.de")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage("en")}>
          🇬🇧 {t("settings.languages.en")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage("vi")}>
          🇻🇳 {t("settings.languages.vi")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
