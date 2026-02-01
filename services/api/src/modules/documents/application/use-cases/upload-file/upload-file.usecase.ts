import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { type UploadFileBase64Input, type UploadFileOutput } from "@corely/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { type FileKind } from "../../../domain/document.types";
import { toDocumentDto, toFileDto } from "../../mappers/document.mapper";

type Deps = {
  logger: LoggerPort;
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  keyPrefix?: string;
  maxUploadBytes?: number;
};

const DEFAULT_MAX_UPLOAD = 50 * 1024 * 1024;

@RequireTenant()
export class UploadFileUseCase extends BaseUseCase<UploadFileBase64Input, UploadFileOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: UploadFileBase64Input,
    ctx: UseCaseContext
  ): Promise<Result<UploadFileOutput, UseCaseError>> {
    const bytes = Buffer.from(input.base64, "base64");

    const maxSize = this.useCaseDeps.maxUploadBytes ?? DEFAULT_MAX_UPLOAD;
    if (bytes.length > maxSize) {
      throw new ValidationError("File too large");
    }

    const now = this.useCaseDeps.clock.now();
    const documentId = this.useCaseDeps.idGenerator.newId();
    const fileId = this.useCaseDeps.idGenerator.newId();
    const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    const prefix =
      this.useCaseDeps.keyPrefix ??
      process.env.STORAGE_KEY_PREFIX ??
      `env/${process.env.NODE_ENV ?? "dev"}`;
    const objectKey = `${prefix}/tenant/${ctx.tenantId}/documents/${documentId}/files/${fileId}/${safeFilename}`;

    // Upload to GCS
    await this.useCaseDeps.objectStorage.putObject({
      tenantId: ctx.tenantId!,
      objectKey,
      contentType: input.contentType,
      bytes,
    });

    const document = DocumentAggregate.create({
      id: documentId,
      tenantId: ctx.tenantId!,
      type: "UPLOAD",
      createdAt: now,
      file: {
        id: fileId,
        kind: "ORIGINAL" as FileKind,
        storageProvider: this.useCaseDeps.objectStorage.provider(),
        bucket: this.useCaseDeps.objectStorage.bucket(),
        objectKey,
        isPublic: input.isPublic,
        contentType: input.contentType,
        sizeBytes: bytes.length,
        createdAt: now,
      },
    });

    await this.useCaseDeps.documentRepo.create(document);
    const file = document.files[0];
    await this.useCaseDeps.fileRepo.create(file);

    return ok({
      document: toDocumentDto(document),
      file: toFileDto(file),
    });
  }
}
