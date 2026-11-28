import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { KNOWLEDGE_DOCUMENT_PREFIX } from "@corely/domain";
import type { TransactionContext } from "@corely/kernel";
import type {
  ProcedureDocuments,
  ProcedureDocumentScope,
  ProcedureFile,
} from "../../application/ports/procedure-documents.port";
import { PrivateEmailOriginalsAdapter } from "./private-email-originals.adapter";

function ownerFor(scope: ProcedureDocumentScope, fileId: string) {
  return { ...scope, id: scope.procedureId + "/" + fileId };
}

function documentId(scope: ProcedureDocumentScope, fileId: string) {
  return (
    KNOWLEDGE_DOCUMENT_PREFIX +
    createHash("sha256")
      .update(JSON.stringify([scope.tenantId, scope.workspaceId, scope.procedureId, fileId]))
      .digest("hex")
  );
}

@Injectable()
export class ProcedureDocumentsAdapter implements ProcedureDocuments {
  constructor(private readonly storage: PrivateEmailOriginalsAdapter) {}

  async store(
    scope: ProcedureDocumentScope,
    fileId: string,
    file: ProcedureFile,
    tx: TransactionContext
  ) {
    const owner = ownerFor(scope, fileId);
    const document = await this.storage.stage(
      owner,
      { ...file, contentType: "application/octet-stream" },
      "procedure-files"
    );
    await this.storage.register(owner, document, tx, documentId(scope, fileId));
  }

  read(scope: ProcedureDocumentScope, fileId: string) {
    return this.storage.read(ownerFor(scope, fileId), documentId(scope, fileId));
  }
}
