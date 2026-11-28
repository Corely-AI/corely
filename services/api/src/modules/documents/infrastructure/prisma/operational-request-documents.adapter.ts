import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import {
  OperationalRequestDocuments,
  OPERATIONAL_REQUEST_DOCUMENT_PREFIX,
  type OperationalRequestDocumentOwner,
  type StagedOperationalRequestDocument,
} from "../../application/ports/operational-request-documents.port";
import { PrivateEmailOriginalsAdapter } from "./private-email-originals.adapter";

@Injectable()
export class OperationalRequestDocumentsAdapter extends OperationalRequestDocuments {
  constructor(private readonly originals: PrivateEmailOriginalsAdapter) {
    super();
  }

  stage(
    owner: OperationalRequestDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ) {
    return this.originals.stage(owner, input, "operational-requests");
  }

  register(
    owner: OperationalRequestDocumentOwner,
    document: StagedOperationalRequestDocument,
    tx: TransactionContext,
    id: string
  ) {
    return this.originals.register(owner, document, tx, id);
  }

  async downloadUrl(owner: OperationalRequestDocumentOwner, id: string) {
    if (!id.startsWith(`${OPERATIONAL_REQUEST_DOCUMENT_PREFIX}${owner.id}-`)) {
      return null;
    }
    const download = await this.originals.downloadUrl(owner, id);
    return download?.url ?? null;
  }
}
