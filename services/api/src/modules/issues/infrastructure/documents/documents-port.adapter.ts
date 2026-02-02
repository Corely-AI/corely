import { unwrap } from "@corely/kernel";
import type { DocumentsPort } from "../../application/ports/documents.port";
import { type DocumentsApplication } from "../../documents/application/documents.application";

export class DocumentsPortAdapter implements DocumentsPort {
  constructor(private readonly documents: DocumentsApplication) {}

  async getDocumentBuffer(params: {
    tenantId: string;
    documentId: string;
  }): Promise<{ buffer: Buffer; contentType: string }> {
    const result = await this.documents.proxyDownload.execute(
      { documentId: params.documentId },
      { tenantId: params.tenantId }
    );
    const data = unwrap(result);
    return { buffer: data.buffer, contentType: data.contentType };
  }
}
