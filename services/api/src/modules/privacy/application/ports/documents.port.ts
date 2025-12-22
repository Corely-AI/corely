export interface DocumentsPort {
  createPrivacyExport(args: {
    tenantId: string;
    subjectUserId: string;
    json: Record<string, unknown>;
  }): Promise<{ documentId: string }>;

  createErasureReport(args: {
    tenantId: string;
    subjectUserId: string;
    json: Record<string, unknown>;
  }): Promise<{ documentId: string }>;
}
