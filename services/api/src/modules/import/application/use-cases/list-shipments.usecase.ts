import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListShipmentsInput, ListShipmentsOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
};

@RequireTenant()
export class ListShipmentsUseCase extends BaseUseCase<ListShipmentsInput, ListShipmentsOutput> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
  }

  protected async handle(
    input: ListShipmentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListShipmentsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.shipmentDeps.repo.list(tenantId, {
      supplierPartyId: input.supplierPartyId,
      status: input.status,
      shippingMode: input.shippingMode,
      estimatedArrivalAfter: input.estimatedArrivalAfter,
      estimatedArrivalBefore: input.estimatedArrivalBefore,
      actualArrivalAfter: input.actualArrivalAfter,
      actualArrivalBefore: input.actualArrivalBefore,
      containerNumber: input.containerNumber,
      billOfLadingNumber: input.billOfLadingNumber,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    });

    return ok({
      shipments: result.shipments.map(toImportShipmentDto),
      total: result.total,
    });
  }
}
