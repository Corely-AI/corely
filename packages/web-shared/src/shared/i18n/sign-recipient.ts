import { negotiateCorelyLocale, type CorelyLocale } from "@corely/contracts";
import { loadSharedCatalog, type resources } from "./resources";

export type SignRecipientMessages = typeof resources.en.translation.sign.recipient;

export async function getSignRecipientLanguage(acceptLanguage: string | null): Promise<{
  lang: CorelyLocale;
  messages: SignRecipientMessages;
}> {
  const lang = negotiateCorelyLocale(acceptLanguage);
  return { lang, messages: (await loadSharedCatalog(lang)).sign.recipient };
}
