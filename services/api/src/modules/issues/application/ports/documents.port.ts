export interface DocumentsPort {
  getDocumentBuffer(params: {
    tenantId: string;
    documentId: string;
  }): Promise<{ buffer: Buffer; contentType: string }>;
}

export const DOCUMENTS_PORT = "issues/documents-port";
