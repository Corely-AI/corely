import { unwrap } from "@corely/kernel";
import type { DocumentsPort } from "../../application/ports/cash-management.ports";
import type { DocumentsApplication } from "../../../documents/application/documents.application";

export class CashDocumentsPortAdapter implements DocumentsPort {
  constructor(private readonly documents: DocumentsApplication) {}

  async assertDocumentAccessible(tenantId: string, documentId: string): Promise<void> {
    const result = await this.documents.getDocument.execute({ documentId }, { tenantId });
    unwrap(result);
  }
}
