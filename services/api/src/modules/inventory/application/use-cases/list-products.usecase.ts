import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  type AuditPort,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListProductsInput, ListProductsOutput } from "@corely/contracts";
import type { ProductRepositoryPort } from "../ports/product-repository.port";
import { toProductDto } from "../mappers/inventory-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

type Deps = {
  logger: LoggerPort;
  repo: ProductRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

@RequireTenant()
export class ListProductsUseCase extends BaseUseCase<ListProductsInput, ListProductsOutput> {
  constructor(private readonly productDeps: Deps) {
    super({ logger: productDeps.logger });
  }

  protected async handle(
    input: ListProductsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListProductsOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;

    const result = await this.productDeps.repo.list(tenantId, {
      search: input.search,
      type: input.type,
      isActive: input.isActive,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toProductDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
