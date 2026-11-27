import messages from "./locales/copy.json";
import { resolveCorelyLocale } from "@corely/contracts";
export const copy = messages;
export type Locale = keyof typeof copy;
export function appCenterLocale(language: string): Locale {
  return resolveCorelyLocale(language);
}
