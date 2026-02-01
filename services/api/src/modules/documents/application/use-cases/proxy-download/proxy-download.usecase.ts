import {
  BaseUseCase,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { type GetDownloadUrlInput } from "@corely/contracts";
import { type DocumentRepoPort } from "../../ports/document-repository.port";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "../../ports/object-storage.port";

type Deps = {
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
};

@RequireTenant()
export class ProxyDownloadUseCase extends BaseUseCase<
  GetDownloadUrlInput,
  { buffer: Buffer; filename: string; contentType: string }
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: null as any });
  }

  protected async handle(
    input: GetDownloadUrlInput,
    ctx: UseCaseContext
  ): Promise<Result<{ buffer: Buffer; filename: string; contentType: string }, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const document = await this.useCaseDeps.documentRepo.findById(tenantId, input.documentId);
    if (!document) {
      throw new NotFoundError("Document not found");
    }

    const file = input.fileId
      ? await this.useCaseDeps.fileRepo.findById(tenantId, input.fileId)
      : (await this.useCaseDeps.fileRepo.findByDocument(tenantId, document.id))[0];

    if (!file) {
      throw new NotFoundError("File not found");
    }

    const buffer = await this.useCaseDeps.objectStorage.getObject({
      tenantId,
      objectKey: file.objectKey,
    });

    const filename = file.objectKey.split("/").pop() || "download";

    return ok({
      buffer,
      filename,
      contentType: file.contentType || "application/octet-stream",
    });
  }
}
