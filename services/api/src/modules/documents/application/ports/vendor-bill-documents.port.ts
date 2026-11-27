import type { TransactionContext } from "@corely/kernel";

export type VendorBillDocumentOwner = { tenantId: string; workspaceId: string; billId: string };
export type StagedVendorBillDocument = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
};

export interface VendorBillDocumentsPort {
  stage(
    owner: VendorBillDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ): Promise<StagedVendorBillDocument>;
  register(
    owner: VendorBillDocumentOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext
  ): Promise<void>;
  downloadUrl(owner: VendorBillDocumentOwner): Promise<{ url: string } | null>;
}

export const VENDOR_BILL_DOCUMENTS = "documents/vendor-bill-documents";
