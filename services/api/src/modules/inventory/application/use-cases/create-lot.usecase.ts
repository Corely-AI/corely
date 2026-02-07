import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  type AuditPort,
  err,
  ok,
  RequireTenant,
  parseLocalDate,
} from "@corely/kernel";
import type { CreateLotInput, CreateLotOutput } from "@corely/contracts";
import type { InventoryLotRepositoryPort } from "../ports/inventory-lot-repository.port";
import { toInventoryLotDto } from "../mappers/inventory-dto.mapper";
import { createInventoryLot } from "../../domain/inventory-lot.entity";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";

type Deps = {
  logger: LoggerPort;
  repo: InventoryLotRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  audit: AuditPort;
};

@RequireTenant()
export class CreateLotUseCase extends BaseUseCase<CreateLotInput, CreateLotOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLotInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLotOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }
    const userId = ctx.userId;

    // Check for duplicate lot number
    const existing = await this.deps.repo.findByLotNumber(
      tenantId,
      input.productId,
      input.lotNumber
    );
    if (existing) {
      return err(
        new ValidationError("Lot number already exists for this product", {
          productId: input.productId,
          lotNumber: input.lotNumber,
        })
      );
    }

    const now = this.deps.clock.now();
    const lot = createInventoryLot({
      id: this.deps.idGenerator.newId(),
      tenantId,
      productId: input.productId,
      lotNumber: input.lotNumber,
      mfgDate: input.mfgDate ? parseLocalDate(input.mfgDate) : null,
      expiryDate: input.expiryDate ? parseLocalDate(input.expiryDate) : null,
      receivedDate: parseLocalDate(input.receivedDate),
      shipmentId: input.shipmentId ?? null,
      supplierPartyId: input.supplierPartyId ?? null,
      unitCostCents: input.unitCostCents ?? null,
      qtyReceived: input.qtyReceived,
      status: input.status,
      notes: input.notes ?? null,
      metadataJson: input.metadataJson ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.deps.repo.create(tenantId, lot);

    await this.deps.audit.log({
      tenantId,
      userId,
      action: "inventory.lot.created",
      entityType: "InventoryLot",
      entityId: lot.id,
    });

    return ok({ lot: toInventoryLotDto(lot) });
  }
}
