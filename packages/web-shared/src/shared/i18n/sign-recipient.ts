import { resources } from "./resources";

export type SignRecipientMessages = typeof resources.en.translation.sign.recipient;

export function getSignRecipientLanguage(acceptLanguage: string | null): {
  lang: keyof typeof resources;
  messages: SignRecipientMessages;
} {
  const preferred = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim() ?? "";
  const primary = preferred.toLowerCase().split("-")[0];
  const lang = primary === "de" || primary === "vi" ? primary : "en";
  return { lang, messages: resources[lang].translation.sign.recipient };
}
