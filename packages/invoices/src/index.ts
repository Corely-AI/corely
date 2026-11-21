export function validateInvoiceDraft(
  draft: { status: string; customerPartyId: string; lineItems: readonly unknown[] },
  billToName: string
): void {
  if (draft.status !== "DRAFT") {
    throw new Error("Only draft invoices can be finalized");
  }
  if (!draft.customerPartyId) {
    throw new Error("Customer is required to finalize");
  }
  if (!draft.lineItems.length) {
    throw new Error("At least one line item is required to finalize");
  }
  if (!billToName.trim()) {
    throw new Error("Bill-to name is required to finalize");
  }
}
