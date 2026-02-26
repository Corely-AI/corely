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
import { type ListCustomerPackagesInput, type ListCustomerPackagesOutput } from "@corely/contracts";
import { toCustomerPackageDto } from "../mappers/engagement-dto.mappers";
import type { PackageRepositoryPort } from "../ports/package-repository.port";

type Deps = { logger: LoggerPort; packages: PackageRepositoryPort };

export class ListCustomerPackagesUseCase extends BaseUseCase<
  ListCustomerPackagesInput,
  ListCustomerPackagesOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListCustomerPackagesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCustomerPackagesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 50;
    const result = await this.deps.packages.listPackages(
      ctx.tenantId,
      {
        customerPartyId: input.customerPartyId,
        status: input.status,
        includeInactive: input.includeInactive,
      },
      {
        cursor: input.cursor,
        pageSize,
      }
    );

    return ok({
      items: result.items.map(toCustomerPackageDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
