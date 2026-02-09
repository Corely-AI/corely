import { type FileEntity, type FileKind } from "@corely/domain";

export interface FileRepoPort {
  create(file: FileEntity): Promise<void>;
  save(file: FileEntity): Promise<void>;
  findById(tenantId: string, fileId: string): Promise<FileEntity | null>;
  findByIdGlobal(fileId: string): Promise<FileEntity | null>;
  findByDocument(tenantId: string, documentId: string): Promise<FileEntity[]>;
  findByDocumentAndKind(
    tenantId: string,
    documentId: string,
    kind: FileKind
  ): Promise<FileEntity | null>;
}
