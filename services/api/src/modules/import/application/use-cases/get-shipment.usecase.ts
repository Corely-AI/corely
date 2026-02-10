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
import type { GetShipmentInput, GetShipmentOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
};

@RequireTenant()
export class GetShipmentUseCase extends BaseUseCase<GetShipmentInput, GetShipmentOutput> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
  }

  protected async handle(
    input: GetShipmentInput,
    ctx: UseCaseContext
  ): Promise<Result<GetShipmentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const shipment = await this.shipmentDeps.repo.findById(tenantId, input.shipmentId);
    if (!shipment) {
      return err(new NotFoundError("Import shipment not found", { shipmentId: input.shipmentId }));
    }

    return ok({ shipment: toImportShipmentDto(shipment) });
  }
}
