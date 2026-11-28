import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { VENDOR_BILL_DOCUMENT_PREFIX } from "@corely/domain";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import { GcsObjectStorageAdapter } from "@corely/storage";
import type {
  StagedVendorBillDocument,
  VendorBillDocumentOwner,
  VendorBillDocumentsPort,
} from "../../application/ports/vendor-bill-documents.port";
import { PrivateEmailOriginalsAdapter } from "./private-email-originals.adapter";

@Injectable()
export class VendorBillDocumentsAdapter implements VendorBillDocumentsPort {
  private readonly originals: PrivateEmailOriginalsAdapter;

  constructor(
    prisma: PrismaService,
    @Inject(GcsObjectStorageAdapter) storage: ObjectStoragePort,
    env: EnvService
  ) {
    this.originals = new PrivateEmailOriginalsAdapter(prisma, storage, env);
  }

  stage(
    owner: VendorBillDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ) {
    return this.originals.stage({ ...owner, id: owner.billId }, input, "bill-originals");
  }

  register(
    owner: VendorBillDocumentOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext
  ) {
    return this.originals.register(
      { ...owner, id: owner.billId },
      document,
      tx,
      `${VENDOR_BILL_DOCUMENT_PREFIX}${owner.billId}`
    );
  }

  downloadUrl(owner: VendorBillDocumentOwner) {
    return this.originals.downloadUrl(
      { ...owner, id: owner.billId },
      `${VENDOR_BILL_DOCUMENT_PREFIX}${owner.billId}`
    );
  }
}
