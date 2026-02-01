import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetProductInput, GetProductOutput } from "@corely/contracts";
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
export class GetProductUseCase extends BaseUseCase<GetProductInput, GetProductOutput> {
  constructor(private readonly productDeps: Deps) {
    super({ logger: productDeps.logger });
  }

  protected async handle(
    input: GetProductInput,
    ctx: UseCaseContext
  ): Promise<Result<GetProductOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;

    const product = await this.productDeps.repo.findById(tenantId, input.productId);
    if (!product) {
      return err(new NotFoundError("Product not found"));
    }

    return ok({ product: toProductDto(product) });
  }
}
