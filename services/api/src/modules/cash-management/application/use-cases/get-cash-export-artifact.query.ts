import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NotFoundError,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import { CASH_EXPORT_REPO, type CashExportRepoPort } from "../ports/cash-management.ports";

@RequireTenant()
@Injectable()
export class GetCashExportArtifactQueryUseCase extends BaseUseCase<
  { artifactId: string },
  { fileName: string; contentType: string; buffer: Buffer; sizeBytes: number }
> {
  constructor(
    @Inject(CASH_EXPORT_REPO)
    private readonly exportRepo: CashExportRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { artifactId: string },
    ctx: UseCaseContext
  ): Promise<
    Result<
      { fileName: string; contentType: string; buffer: Buffer; sizeBytes: number },
      UseCaseError
    >
  > {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const artifact = await this.exportRepo.findArtifactById(
      tenantId,
      workspaceId,
      input.artifactId
    );
    if (!artifact) {
      throw new NotFoundError(
        "Export artifact not found",
        undefined,
        "CashManagement:ExportNotFound"
      );
    }

    return ok({
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      buffer: Buffer.from(artifact.contentBase64, "base64"),
      sizeBytes: artifact.sizeBytes,
    });
  }
}
