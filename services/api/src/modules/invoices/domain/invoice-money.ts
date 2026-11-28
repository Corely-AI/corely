import { ValidationError } from "@corely/kernel";
const currencies = new Set(Intl.supportedValuesOf("currency"));
const maxInteger = 2_147_483_647;

export function validateInvoiceCurrency(currency: string): void {
  if (
    !currencies.has(currency) ||
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits !== 2
  ) {
    throw new ValidationError("Choose a supported currency with two minor-unit digits.");
  }
}

export function validateInvoiceLineAmounts(
  lines: ReadonlyArray<{ qty?: number; unitPriceCents?: number }>
): void {
  let subtotalCents = 0;
  for (const { qty, unitPriceCents } of lines) {
    if (
      typeof qty !== "number" ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > maxInteger ||
      typeof unitPriceCents !== "number" ||
      !Number.isInteger(unitPriceCents) ||
      unitPriceCents < 0 ||
      unitPriceCents > maxInteger
    ) {
      throw new ValidationError(
        "Invoice lines require a positive whole quantity and a valid price in cents."
      );
    }
    subtotalCents += qty * unitPriceCents;
    if (subtotalCents > maxInteger) {
      throw new ValidationError("Invoice subtotal exceeds the supported amount.");
    }
  }
}
