import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { UpsertAccountMappingInput, UpsertAccountMappingOutput } from "@corely/contracts";
import { toAccountMappingDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { MappingDeps } from "./purchasing-mapping.deps";
import { buildMapping } from "./purchasing-mapping.deps";

@RequireTenant()
export class UpsertAccountMappingUseCase extends BaseUseCase<
  UpsertAccountMappingInput,
  UpsertAccountMappingOutput
> {
  constructor(private readonly services: MappingDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpsertAccountMappingInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertAccountMappingOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<UpsertAccountMappingOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.upsert-mapping",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const mapping = buildMapping({
      id: this.services.idGenerator.newId(),
      tenantId,
      supplierPartyId: input.supplierPartyId,
      categoryKey: input.categoryKey,
      glAccountId: input.glAccountId,
      now: this.services.clock.now(),
    });

    const saved = await this.services.mappingRepo.upsert(mapping);

    const result = { mapping: toAccountMappingDto(saved) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.upsert-mapping",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
