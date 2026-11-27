import type { TransactionContext } from "@corely/kernel";
import type { StagedVendorBillDocument } from "./vendor-bill-documents.port";

export type ExpenseReceiptDocumentOwner = {
  tenantId: string;
  workspaceId: string;
  receiptId: string;
};

export interface ExpenseReceiptDocumentsPort {
  stage(
    owner: ExpenseReceiptDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ): Promise<StagedVendorBillDocument>;
  register(
    owner: ExpenseReceiptDocumentOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext
  ): Promise<void>;
  downloadUrl(owner: ExpenseReceiptDocumentOwner): Promise<{ url: string } | null>;
}

export const EXPENSE_RECEIPT_DOCUMENTS = "documents/expense-receipt-documents";
