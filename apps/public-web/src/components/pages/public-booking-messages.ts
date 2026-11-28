import { negotiateCorelyLocale, normalizeCorelyLocale } from "@corely/contracts";
import messages from "./locales/public-booking.json";

export type PublicBookingMessages = typeof messages.en;

export function getPublicBookingMessages(hint: string | undefined, acceptLanguage: string | null) {
  const locale = normalizeCorelyLocale(hint) ?? negotiateCorelyLocale(acceptLanguage);
  return { locale, copy: messages[locale] };
}
