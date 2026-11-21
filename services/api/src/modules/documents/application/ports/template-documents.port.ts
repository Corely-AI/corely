export type TemplateDocumentOwner = {
  tenantId: string;
  workspaceId: string;
  templateId: string;
  sha256: string;
};
export abstract class TemplateDocuments {
  abstract store(owner: TemplateDocumentOwner, bytes: Buffer): Promise<void>;
  abstract read(owner: TemplateDocumentOwner): Promise<Buffer | null>;
}
