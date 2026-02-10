import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetLotInput, GetLotOutput } from "@corely/contracts";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";
import { toInventoryLotDto } from "../mappers/inventory-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: InventoryLotRepositoryPort;
};

@RequireTenant()
export class GetLotUseCase extends BaseUseCase<GetLotInput, GetLotOutput> {
  constructor(private readonly lotDeps: Deps) {
    super({ logger: lotDeps.logger });
  }

  protected async handle(
    input: GetLotInput,
    ctx: UseCaseContext
  ): Promise<Result<GetLotOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const lot = await this.lotDeps.repo.findById(tenantId, input.id);
    if (!lot) {
      return err(new NotFoundError("Lot not found", { lotId: input.id }));
    }

    return ok({ lot: toInventoryLotDto(lot) });
  }
}
