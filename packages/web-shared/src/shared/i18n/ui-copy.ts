import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { catalogText } from "./catalog-text";
import en from "./locales/en.json";

export function useUiCopy(screen: string) {
  const { t } = useTranslation(undefined, { useSuspense: false });
  return useCallback(
    (message: string) => {
      const key = `${screen}.${message}`;
      const defaultValue = catalogText(en.ui, `${screen.slice("ui.".length)}.${message}`) ?? key;
      const translated = t(key, { defaultValue });
      return translated === key ? defaultValue : translated;
    },
    [screen, t]
  );
}
