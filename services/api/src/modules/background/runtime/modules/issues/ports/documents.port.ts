export interface DocumentsPort {
  getAudioBuffer(params: {
    tenantId: string;
    documentId: string;
  }): Promise<{ buffer: Buffer; contentType: string }>;
}

export const DOCUMENTS_PORT = "worker/issues/documents-port";
