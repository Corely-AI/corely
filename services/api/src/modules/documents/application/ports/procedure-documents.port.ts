import type { TransactionContext } from "@corely/kernel";

export const PROCEDURE_DOCUMENTS = Symbol("documents/procedure-files");
export type ProcedureDocumentScope = { tenantId: string; workspaceId: string; procedureId: string };
export type ProcedureFile = { filename: string; bytes: Buffer };

export interface ProcedureDocuments {
  store(
    scope: ProcedureDocumentScope,
    fileId: string,
    file: ProcedureFile,
    tx: TransactionContext
  ): Promise<void>;
  read(scope: ProcedureDocumentScope, fileId: string): Promise<Buffer | null>;
}
