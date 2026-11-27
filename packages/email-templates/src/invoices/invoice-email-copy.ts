import { resolveCorelyLocale } from "@corely/contracts";
import messages from "./locales/invoice-email.json";
import type { InvoiceEmailProps } from "./invoice-email.types";

export function getInvoiceEmailCopy(locale: string | undefined) {
  const language = resolveCorelyLocale(locale);
  return { language, copy: messages[language] };
}

export function formatInvoiceEmailTitle(
  template: string,
  { companyName, invoiceNumber }: Pick<InvoiceEmailProps, "companyName" | "invoiceNumber">
) {
  return template.replace(/\{\{(company|number)\}\}/g, (_, key: string) =>
    key === "company" ? companyName : invoiceNumber
  );
}
