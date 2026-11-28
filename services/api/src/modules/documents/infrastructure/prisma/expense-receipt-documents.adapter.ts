import { Injectable } from "@nestjs/common";
import { EXPENSE_RECEIPT_DOCUMENT_PREFIX } from "@corely/domain";
import type { TransactionContext } from "@corely/kernel";
import type {
  ExpenseReceiptDocumentOwner,
  ExpenseReceiptDocumentsPort,
} from "../../application/ports/expense-receipt-documents.port";
import type { StagedVendorBillDocument } from "../../application/ports/vendor-bill-documents.port";
import { PrivateEmailOriginalsAdapter } from "./private-email-originals.adapter";

@Injectable()
export class ExpenseReceiptDocumentsAdapter implements ExpenseReceiptDocumentsPort {
  constructor(private readonly originals: PrivateEmailOriginalsAdapter) {}

  stage(
    owner: ExpenseReceiptDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ) {
    return this.originals.stage({ ...owner, id: owner.receiptId }, input, "receipt-originals");
  }

  register(
    owner: ExpenseReceiptDocumentOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext
  ) {
    return this.originals.register(
      { ...owner, id: owner.receiptId },
      document,
      tx,
      `${EXPENSE_RECEIPT_DOCUMENT_PREFIX}${owner.receiptId}`
    );
  }

  downloadUrl(owner: ExpenseReceiptDocumentOwner) {
    return this.originals.downloadUrl(
      { ...owner, id: owner.receiptId },
      `${EXPENSE_RECEIPT_DOCUMENT_PREFIX}${owner.receiptId}`
    );
  }
}
