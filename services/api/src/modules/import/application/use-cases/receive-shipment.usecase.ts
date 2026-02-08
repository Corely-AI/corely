import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  parseLocalDate,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ReceiveShipmentInput, ReceiveShipmentOutput } from "@corely/contracts";
import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";
import { toImportShipmentDto } from "../mappers/import-shipment-dto.mapper";

type Deps = {
  logger: LoggerPort;
  repo: ImportShipmentRepositoryPort;
  clock: ClockPort;
  audit: AuditPort;
};

@RequireTenant()
export class ReceiveShipmentUseCase extends BaseUseCase<
  ReceiveShipmentInput,
  ReceiveShipmentOutput
> {
  constructor(private readonly shipmentDeps: Deps) {
    super({ logger: shipmentDeps.logger });
  }

  protected async handle(
    input: ReceiveShipmentInput,
    ctx: UseCaseContext
  ): Promise<Result<ReceiveShipmentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    const shipment = await this.shipmentDeps.repo.findById(tenantId, input.shipmentId);
    if (!shipment) {
      return err(new NotFoundError("Import shipment not found", { shipmentId: input.shipmentId }));
    }

    // Only allow receiving from CLEARED status
    if (shipment.status !== "CLEARED") {
      return err(
        new ValidationError("Only CLEARED shipments can be received", {
          currentStatus: shipment.status,
        })
      );
    }

    // Validate input lines match shipment lines
    const shipmentLineIds = new Set(shipment.lines.map((l) => l.id));
    for (const inputLine of input.lines) {
      if (!shipmentLineIds.has(inputLine.lineId)) {
        return err(
          new ValidationError("Invalid line ID", {
            lineId: inputLine.lineId,
          })
        );
      }
    }

    // Update line received quantities
    const receivedQtyMap = new Map(input.lines.map((l) => [l.lineId, l.receivedQty]));
    const updatedLines = shipment.lines.map((line) => ({
      ...line,
      receivedQty: receivedQtyMap.get(line.id) ?? line.receivedQty,
    }));

    const now = this.shipmentDeps.clock.now();
    const receivedDateLocal = parseLocalDate(input.receivedDate);

    const updated = {
      ...shipment,
      status: "RECEIVED" as const,
      receivedDate: input.receivedDate,
      lines: updatedLines,
      updatedByUserId: userId,
      updatedAt: now,
    };

    await this.shipmentDeps.repo.update(tenantId, updated);

    await this.shipmentDeps.audit.log({
      tenantId,
      userId,
      action: "import.shipment.received",
      entityType: "ImportShipment",
      entityId: updated.id,
    });

    // Note: In a full implementation, this use case would:
    // 1. Create an InventoryDocument (RECEIPT) via inventory module service
    // 2. Create InventoryLot records linked to shipmentId
    // 3. Return the actual receiptDocumentId
    //
    // For PR3, we're keeping modules decoupled. The receipt creation
    // and lot linking will be handled separately (manually or via events).
    // This use case just updates the shipment status and received quantities.

    // For now, we generate a placeholder receipt document ID
    // In reality, this would come from inventory module integration
    const receiptDocumentId = `receipt_for_${shipment.id}`;

    return ok({
      shipment: toImportShipmentDto(updated),
      receiptDocumentId,
    });
  }
}
