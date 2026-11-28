export const invoiceListDeletionReasons = [
  "Soft delete",
  "Bulk delete",
  "Regenerated class billing run",
];

export function isInvoiceListDeletionReason(reason?: string | null): boolean {
  return reason != null && invoiceListDeletionReasons.includes(reason);
}
