import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListAccountMappingsInput, ListAccountMappingsOutput } from "@corely/contracts";
import { toAccountMappingDto } from "../mappers/purchasing-dto.mapper";
import type { MappingDeps } from "./purchasing-mapping.deps";

@RequireTenant()
export class ListAccountMappingsUseCase extends BaseUseCase<
  ListAccountMappingsInput,
  ListAccountMappingsOutput
> {
  constructor(private readonly services: MappingDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListAccountMappingsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListAccountMappingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const mappings = await this.services.mappingRepo.list(tenantId, input.supplierPartyId);
    return ok({ mappings: mappings.map(toAccountMappingDto) });
  }
}
