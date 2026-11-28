import type { TransactionContext } from "@corely/kernel";

export type OperationalRequestDocumentOwner = { tenantId: string; workspaceId: string; id: string };
export type StagedOperationalRequestDocument = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
};
export { OPERATIONAL_REQUEST_DOCUMENT_PREFIX } from "@corely/domain";

export abstract class OperationalRequestDocuments {
  abstract stage(
    owner: OperationalRequestDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ): Promise<StagedOperationalRequestDocument>;
  abstract register(
    owner: OperationalRequestDocumentOwner,
    document: StagedOperationalRequestDocument,
    tx: TransactionContext,
    id: string
  ): Promise<void>;
  abstract downloadUrl(owner: OperationalRequestDocumentOwner, id: string): Promise<string | null>;
}
