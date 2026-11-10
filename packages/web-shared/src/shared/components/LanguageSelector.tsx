import React from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "./language-picker";
import {
  persistFocusedLocale,
  resolveFocusedLocale,
  type FocusedLocale,
} from "../../session/focused-locale";

export const LanguageSelector = ({ className }: { className?: string }) => {
  const { i18n } = useTranslation();
  const changeLanguage = (locale: FocusedLocale) => {
    void i18n.changeLanguage(locale);
    persistFocusedLocale(locale);
  };
  return (
    <LanguagePicker
      locale={resolveFocusedLocale(i18n.language, "en")}
      onChange={changeLanguage}
      className={className}
    />
  );
};
