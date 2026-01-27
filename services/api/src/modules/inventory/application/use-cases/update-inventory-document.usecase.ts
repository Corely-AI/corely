import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type {
  UpdateInventoryDocumentInput,
  UpdateInventoryDocumentOutput,
} from "@corely/contracts";
import { toInventoryDocumentDto } from "../mappers/inventory-dto.mapper";
import {
  buildLineItems,
  validateProducts,
  validateLineLocations,
  optionalLocalDate,
} from "./inventory-document.helpers";
import type { DocumentDeps } from "./inventory-document.deps";

@RequireTenant()
export class UpdateInventoryDocumentUseCase extends BaseUseCase<
  UpdateInventoryDocumentInput,
  UpdateInventoryDocumentOutput
> {
  constructor(private readonly documentDeps: DocumentDeps) {
    super({ logger: documentDeps.logger });
  }

  protected async handle(
    input: UpdateInventoryDocumentInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInventoryDocumentOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const document = await this.documentDeps.repo.findById(tenantId, input.documentId);
    if (!document) {
      return err(new NotFoundError("Document not found"));
    }

    const now = this.documentDeps.clock.now();
    if (input.headerPatch) {
      document.updateHeader(
        {
          partyId: input.headerPatch.partyId,
          reference: input.headerPatch.reference,
          scheduledDate: optionalLocalDate(input.headerPatch.scheduledDate),
          postingDate: optionalLocalDate(input.headerPatch.postingDate),
          notes: input.headerPatch.notes,
          sourceType: input.headerPatch.sourceType,
          sourceId: input.headerPatch.sourceId,
        },
        now
      );
    }

    if (input.lineItems) {
      let lineItems = buildLineItems({
        idGenerator: this.documentDeps.idGenerator,
        lineItems: input.lineItems,
      });
      await validateProducts({
        tenantId,
        productRepo: this.documentDeps.productRepo,
        lines: lineItems,
      });
      const settings = await this.documentDeps.settingsRepo.findByTenant(tenantId);
      lineItems = await validateLineLocations({
        tenantId,
        documentType: document.documentType,
        lines: lineItems,
        settings,
        warehouseRepo: this.documentDeps.warehouseRepo,
        locationRepo: this.documentDeps.locationRepo,
      });
      document.replaceLineItems(lineItems, now);
    }

    await this.documentDeps.repo.save(tenantId, document);
    await this.documentDeps.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "inventory.document.updated",
      entityType: "InventoryDocument",
      entityId: document.id,
    });

    return ok({ document: toInventoryDocumentDto(document) });
  }
}
