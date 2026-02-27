import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type ListPackageUsageInput, type ListPackageUsageOutput } from "@corely/contracts";
import { toPackageUsageDto } from "../mappers/engagement-dto.mappers";
import type { PackageRepositoryPort } from "../ports/package-repository.port";

type Deps = { logger: LoggerPort; packages: PackageRepositoryPort };

export class ListPackageUsageUseCase extends BaseUseCase<
  ListPackageUsageInput,
  ListPackageUsageOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListPackageUsageInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPackageUsageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.deps.packages.listUsage(ctx.tenantId, input.customerPackageId, {
      cursor: input.cursor,
      pageSize: input.pageSize ?? 50,
    });

    return ok({
      items: result.items.map(toPackageUsageDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
