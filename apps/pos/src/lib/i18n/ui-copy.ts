import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import en from "./locales/en.json";

const english: Record<string, Record<string, string>> = en.ui;

export function useUiCopy(screen: string) {
  const { t } = useTranslation(undefined, { useSuspense: false });
  return useCallback(
    (message: string) => {
      const key = `${screen}.${message}`;
      const defaultValue = english[screen.slice("ui.".length)]?.[message] ?? key;
      const translated = t(key, { defaultValue });
      return translated === key ? defaultValue : translated;
    },
    [screen, t]
  );
}
