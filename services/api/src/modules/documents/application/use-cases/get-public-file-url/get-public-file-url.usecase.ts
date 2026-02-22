import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
} from "@corely/kernel";
import { type GetPublicFileUrlInput, type GetPublicFileUrlOutput } from "@corely/contracts";
import { type FileRepoPort } from "../../ports/file-repository.port";
import { type ObjectStoragePort } from "@corely/kernel";

type Deps = {
  logger: LoggerPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  downloadTtlSeconds: number;
};

const buildDirectGcsPublicUrl = (bucket: string, objectKey: string): string =>
  `https://storage.googleapis.com/${encodeURIComponent(bucket)}/${encodeURIComponent(objectKey)}`;

export class GetPublicFileUrlUseCase extends BaseUseCase<
  GetPublicFileUrlInput,
  GetPublicFileUrlOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: GetPublicFileUrlInput): GetPublicFileUrlInput {
    if (!input.fileId) {
      throw new ValidationError("fileId is required");
    }
    return input;
  }

  protected async handle(
    input: GetPublicFileUrlInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPublicFileUrlOutput, UseCaseError>> {
    const file = ctx.tenantId
      ? await this.useCaseDeps.fileRepo.findById(ctx.tenantId, input.fileId)
      : await this.useCaseDeps.fileRepo.findByIdGlobal(input.fileId);
    if (!file || !file.isPublic) {
      return err(new NotFoundError("File not found"));
    }

    const expiresAt = new Date(Date.now() + this.useCaseDeps.downloadTtlSeconds * 1000);

    if (file.storageProvider === "gcs") {
      return ok({
        url: buildDirectGcsPublicUrl(file.bucket, file.objectKey),
        expiresAt: expiresAt.toISOString(),
      });
    }

    const signed = await this.useCaseDeps.objectStorage.createSignedDownloadUrl({
      tenantId: file.tenantId,
      objectKey: file.objectKey,
      expiresInSeconds: this.useCaseDeps.downloadTtlSeconds,
    });

    return ok({ url: signed.url, expiresAt: signed.expiresAt.toISOString() });
  }
}
